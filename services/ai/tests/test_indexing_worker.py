"""Synthetic tests for the PDF indexing worker."""

from io import BytesIO
from uuid import uuid4

import pytest
from reportlab.pdfgen import canvas

from app.pipelines.parsers.pdf import PdfProcessingError
from app.repositories.models import SourceType
from app.schemas.indexing import IndexArtifact, IndexDocumentCommand, IndexedChunk
from app.services.indexing import DocumentIndexWorker


class FakeDownloadClient:
    """In-memory signed URL download fake."""

    def __init__(self, content: bytes) -> None:
        """Create a downloader returning fixed synthetic bytes.

        Args:
            content: Synthetic PDF bytes returned by download.

        Returns:
            None.

        Raises:
            None.
        """

        self._content = content
        self.call_count = 0

    async def download(self, *, signed_url: str, max_bytes: int) -> bytes:
        """Return configured bytes while enforcing the requested limit.

        Args:
            signed_url: Synthetic HTTPS URL.
            max_bytes: Hard accepted byte limit.

        Returns:
            Configured file bytes.

        Raises:
            ValueError: If URL or size limit is invalid.
            RuntimeError: If configured bytes exceed max_bytes.
        """

        if not signed_url.startswith("https://") or max_bytes < 1:
            raise ValueError("valid HTTPS URL and positive max_bytes are required")
        if len(self._content) > max_bytes:
            raise RuntimeError("download exceeds maximum size")
        self.call_count += 1
        return self._content


class BatchEmbeddingClient:
    """Embedding fake that records batch sizes."""

    def __init__(self, dimensions: int = 1024) -> None:
        """Create a fixed-dimension fake.

        Args:
            dimensions: Vector length returned per text.

        Returns:
            None.

        Raises:
            ValueError: If dimensions is not positive.
        """

        if dimensions < 1:
            raise ValueError("dimensions must be positive")
        self._dimensions = dimensions
        self.batch_sizes: list[int] = []

    async def embed(self, texts: tuple[str, ...]) -> tuple[tuple[float, ...], ...]:
        """Return deterministic vectors and record each batch size.

        Args:
            texts: Non-empty chunk text batch.

        Returns:
            One fixed vector per text.

        Raises:
            ValueError: If texts is empty.
        """

        if not texts:
            raise ValueError("texts must not be empty")
        self.batch_sizes.append(len(texts))
        vector = tuple(0.25 for _ in range(self._dimensions))
        return tuple(vector for _ in texts)


class RecordingIndexRepository:
    """Repository fake recording one atomic replacement."""

    def __init__(self) -> None:
        """Initialize empty recorded values.

        Args:
            None.

        Returns:
            None.

        Raises:
            None.
        """

        self.command: IndexDocumentCommand | None = None
        self.chunks: tuple[IndexedChunk, ...] = ()
        self.artifact: IndexArtifact | None = None

    def replace_index(
        self,
        *,
        command: IndexDocumentCommand,
        chunks: tuple[IndexedChunk, ...],
        artifact: IndexArtifact,
    ) -> None:
        """Record the complete index payload.

        Args:
            command: Synthetic index command.
            chunks: Generated text/vector pairs.
            artifact: Safe generated metadata.

        Returns:
            None.

        Raises:
            ValueError: If no chunks are supplied.
        """

        if not chunks:
            raise ValueError("chunks must not be empty")
        self.command = command
        self.chunks = chunks
        self.artifact = artifact


def _pdf_bytes(*page_texts: str) -> bytes:
    """Create a synthetic text-layer PDF entirely in memory.

    Args:
        page_texts: Text written on successive PDF pages.

    Returns:
        Complete PDF bytes.

    Raises:
        ValueError: If no pages are supplied.
    """

    if not page_texts:
        raise ValueError("at least one page is required")
    buffer = BytesIO()
    document = canvas.Canvas(buffer)
    for page_text in page_texts:
        document.drawString(72, 760, page_text)
        document.showPage()
    document.save()
    return buffer.getvalue()


def _command() -> IndexDocumentCommand:
    """Build a valid synthetic Personal PDF index command.

    Args:
        None.

    Returns:
        Valid command with no real user or storage data.

    Raises:
        None.
    """

    return IndexDocumentCommand(
        request_id="req_index_001",
        idempotency_key="doc-v1-pipeline-index",
        document_id=uuid4(),
        document_version=1,
        owner_id=uuid4(),
        source_type=SourceType.PERSONAL_PDF,
        pipeline_version="pdf-v1",
        signed_url="https://storage.invalid/synthetic.pdf?signature=fake",
        mime_type="application/pdf",
    )


@pytest.mark.anyio
async def test_index_worker_preserves_pages_and_vector_dimensions() -> None:
    """Confirm the worker persists page-bounded 1024-dimensional chunks."""

    download_client = FakeDownloadClient(
        _pdf_bytes(
            "Trang mot noi dung giao dich ACID.",
            "Trang hai noi dung isolation level.",
        )
    )
    embedding_client = BatchEmbeddingClient()
    repository = RecordingIndexRepository()
    worker = DocumentIndexWorker(
        download_client=download_client,
        embedding_client=embedding_client,
        index_repository=repository,
        embedding_model="openai/text-embedding-3-large",
        embedding_batch_size=1,
    )

    artifact = await worker.execute(_command())

    assert artifact.page_count == 2
    assert artifact.chunk_count == 2
    assert artifact.embedding_dimensions == 1024
    assert embedding_client.batch_sizes == [1, 1]
    assert tuple(item.chunk.page_number for item in repository.chunks) == (1, 2)
    assert all(len(item.embedding) == 1024 for item in repository.chunks)


@pytest.mark.anyio
async def test_index_worker_does_not_embed_pdf_without_text_layer() -> None:
    """Confirm blank PDFs fail before embedding or persistence."""

    embedding_client = BatchEmbeddingClient()
    repository = RecordingIndexRepository()
    worker = DocumentIndexWorker(
        download_client=FakeDownloadClient(_pdf_bytes("")),
        embedding_client=embedding_client,
        index_repository=repository,
        embedding_model="openai/text-embedding-3-large",
    )

    with pytest.raises(PdfProcessingError) as captured:
        await worker.execute(_command())

    assert captured.value.code == "PDF_TEXT_REQUIRED"
    assert embedding_client.batch_sizes == []
    assert repository.artifact is None


@pytest.mark.anyio
async def test_index_keeps_total_page_count_including_trailing_blank_pages() -> None:
    """Blank pages do not create chunks, but total page metadata must remain correct."""
    repository = RecordingIndexRepository()
    worker = DocumentIndexWorker(
        download_client=FakeDownloadClient(_pdf_bytes("Text", "", "")),
        embedding_client=BatchEmbeddingClient(),
        index_repository=repository,
        embedding_model="openai/text-embedding-3-large",
    )
    artifact = await worker.execute(_command())
    assert artifact.page_count == 3
    assert artifact.chunk_count == 1
