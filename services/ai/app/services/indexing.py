"""PDF indexing workflow independent from HTTP and job scheduling."""

import math

from app.clients.document_download import DocumentDownloadClient
from app.clients.protocols import EmbeddingClient
from app.pipelines.chunking import chunk_pages
from app.pipelines.parsers.pdf import parse_pdf
from app.repositories.index_repository import DocumentIndexRepository
from app.schemas.indexing import IndexArtifact, IndexDocumentCommand, IndexedChunk


class DocumentIndexWorker:
    """Download, validate, chunk, embed, and persist one PDF index."""

    def __init__(
        self,
        *,
        download_client: DocumentDownloadClient,
        embedding_client: EmbeddingClient,
        index_repository: DocumentIndexRepository,
        embedding_model: str,
        embedding_dimensions: int = 1024,
        max_pdf_bytes: int = 50 * 1024 * 1024,
        chunk_characters: int = 1_800,
        overlap_characters: int = 200,
        embedding_batch_size: int = 32,
    ) -> None:
        """Create a deterministic PDF indexing worker.

        Args:
            download_client: Client that fetches the signed PDF URL.
            embedding_client: Provider using the configured index model.
            index_repository: AI-owned persistence boundary.
            embedding_model: Model identifier recorded with the index.
            embedding_dimensions: Exact vector dimensions required.
            max_pdf_bytes: Hard file size limit.
            chunk_characters: Maximum characters in a page-bounded chunk.
            overlap_characters: Character overlap within the same page.
            embedding_batch_size: Maximum texts sent per provider request.

        Returns:
            None.

        Raises:
            ValueError: If configuration is blank or outside safe limits.
        """

        if not embedding_model.strip():
            raise ValueError("embedding_model must not be blank")
        if embedding_dimensions < 1 or max_pdf_bytes < 1:
            raise ValueError("embedding dimensions and PDF size limit must be positive")
        if chunk_characters < 100:
            raise ValueError("chunk_characters must be at least 100")
        if overlap_characters < 0 or overlap_characters >= chunk_characters:
            raise ValueError("overlap_characters must be smaller than chunk_characters")
        if not 1 <= embedding_batch_size <= 256:
            raise ValueError("embedding_batch_size must be between 1 and 256")
        self._download_client = download_client
        self._embedding_client = embedding_client
        self._index_repository = index_repository
        self._embedding_model = embedding_model
        self._embedding_dimensions = embedding_dimensions
        self._max_pdf_bytes = max_pdf_bytes
        self._chunk_characters = chunk_characters
        self._overlap_characters = overlap_characters
        self._embedding_batch_size = embedding_batch_size

    async def execute(self, command: IndexDocumentCommand) -> IndexArtifact:
        """Build and atomically persist one authorized PDF index.

        Args:
            command: Validated identity, owner, pipeline, and signed URL.

        Returns:
            Safe page/chunk/model metadata for Java job polling.

        Raises:
            PdfProcessingError: If the file is invalid, encrypted, or lacks a
                text layer.
            ValueError: If embedding output shape is invalid.
            RuntimeError: If download, embedding, or persistence fails.
        """

        content = await self._download_client.download(
            signed_url=str(command.signed_url),
            max_bytes=self._max_pdf_bytes,
        )
        parsed = parse_pdf(content, max_bytes=self._max_pdf_bytes)
        pages = parsed.pages
        chunks = chunk_pages(
            pages,
            max_characters=self._chunk_characters,
            overlap_characters=self._overlap_characters,
        )
        indexed_chunks: list[IndexedChunk] = []
        for offset in range(0, len(chunks), self._embedding_batch_size):
            batch = chunks[offset : offset + self._embedding_batch_size]
            vectors = await self._embedding_client.embed(tuple(item.text for item in batch))
            if len(vectors) != len(batch):
                raise ValueError("embedding count does not match chunk count")
            for chunk, vector in zip(batch, vectors, strict=True):
                if len(vector) != self._embedding_dimensions:
                    raise ValueError("embedding provider returned unexpected dimensions")
                if not all(math.isfinite(value) for value in vector) or not any(vector):
                    raise ValueError("embedding must be finite and nonzero")
                indexed_chunks.append(IndexedChunk(chunk=chunk, embedding=vector))

        artifact = IndexArtifact(
            page_count=parsed.page_count,
            chunk_count=len(indexed_chunks),
            embedding_model=self._embedding_model,
            embedding_dimensions=self._embedding_dimensions,
            pipeline_version=command.pipeline_version,
        )
        self._index_repository.replace_index(
            command=command,
            chunks=tuple(indexed_chunks),
            artifact=artifact,
        )
        return artifact
