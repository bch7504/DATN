"""PDF indexing workflow independent from HTTP and job scheduling."""

import math

from app.clients.document_download import DocumentDownloadClient
from app.clients.protocols import EmbeddingClient, VisionCaptionClient
from app.pipelines.chunking import chunk_pages
from app.pipelines.parsers.pdf_multimodal import parse_pdf_multimodal
from app.repositories.index_repository import DocumentIndexRepository
from app.schemas.indexing import IndexArtifact, IndexDocumentCommand, IndexedChunk


class DocumentIndexWorker:
    """Download, validate, chunk, embed, and persist one PDF index with multimodal support."""

    def __init__(
        self,
        *,
        download_client: DocumentDownloadClient,
        embedding_client: EmbeddingClient,
        index_repository: DocumentIndexRepository,
        embedding_model: str,
        vision_client: VisionCaptionClient | None = None,
        enable_vision: bool = True,
        embedding_dimensions: int = 1024,
        max_pdf_bytes: int = 50 * 1024 * 1024,
        chunk_characters: int = 1_800,
        overlap_characters: int = 200,
        embedding_batch_size: int = 32,
        max_vision_pages: int = 100,
        vision_timeout_seconds: float = 20.0,
        max_vision_context_characters: int = 400,
        max_vision_caption_characters: int = 4_000,
        max_vision_render_pixels: int = 4_000_000,
    ) -> None:
        """Create a deterministic PDF indexing worker.

        Args:
            download_client: Client that fetches the signed PDF URL.
            embedding_client: Provider using the configured index model.
            index_repository: AI-owned persistence boundary.
            embedding_model: Model identifier recorded with the index.
            vision_client: Optional Vision LLM client for diagram captioning.
            enable_vision: Whether visual diagram extraction is enabled.
            embedding_dimensions: Exact vector dimensions required.
            max_pdf_bytes: Hard file size limit.
            chunk_characters: Maximum characters in a page-bounded chunk.
            overlap_characters: Character overlap within the same page.
            embedding_batch_size: Maximum texts sent per provider request.
            max_vision_pages: Maximum visual pages sent to the provider per PDF.
            vision_timeout_seconds: Maximum provider wait time per visual page.
            max_vision_context_characters: Maximum text context sent per visual page.
            max_vision_caption_characters: Maximum accepted visual caption length.
            max_vision_render_pixels: Maximum rendered pixels per visual page.

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
        if not 1 <= max_vision_pages <= 500:
            raise ValueError("max_vision_pages must be between 1 and 500")
        if not 0.1 <= vision_timeout_seconds <= 120:
            raise ValueError("vision_timeout_seconds must be between 0.1 and 120")
        if not 1 <= max_vision_context_characters <= 4_000:
            raise ValueError("max_vision_context_characters must be between 1 and 4000")
        if not 100 <= max_vision_caption_characters <= 20_000:
            raise ValueError("max_vision_caption_characters must be between 100 and 20000")
        if not 250_000 <= max_vision_render_pixels <= 16_000_000:
            raise ValueError("max_vision_render_pixels must be between 250000 and 16000000")
        self._download_client = download_client
        self._embedding_client = embedding_client
        self._index_repository = index_repository
        self._embedding_model = embedding_model
        self._vision_client = vision_client
        self._enable_vision = enable_vision
        self._embedding_dimensions = embedding_dimensions
        self._max_pdf_bytes = max_pdf_bytes
        self._chunk_characters = chunk_characters
        self._overlap_characters = overlap_characters
        self._embedding_batch_size = embedding_batch_size
        self._max_vision_pages = max_vision_pages
        self._vision_timeout_seconds = vision_timeout_seconds
        self._max_vision_context_characters = max_vision_context_characters
        self._max_vision_caption_characters = max_vision_caption_characters
        self._max_vision_render_pixels = max_vision_render_pixels

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

        # Vision failures are already isolated inside the parser. Validation and resource
        # errors must remain visible instead of silently dropping layout/table enrichment.
        active_vision = self._vision_client if self._enable_vision else None
        parsed = await parse_pdf_multimodal(
            content,
            max_bytes=self._max_pdf_bytes,
            vision_client=active_vision,
            max_vision_pages=self._max_vision_pages,
            vision_timeout_seconds=self._vision_timeout_seconds,
            max_vision_context_characters=self._max_vision_context_characters,
            max_vision_caption_characters=self._max_vision_caption_characters,
            max_render_pixels=self._max_vision_render_pixels,
        )

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
