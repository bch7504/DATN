"""Opt-in integration checks for the real PostgreSQL and pgvector repositories."""

import os
from io import BytesIO
from uuid import uuid4

import pytest
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine, delete, text
from sqlalchemy.orm import Session

from app.repositories.chunk_repository import PgVectorChunkRepository
from app.repositories.index_repository import SqlAlchemyDocumentIndexRepository
from app.repositories.models import DocumentIndex, SourceType
from app.schemas.grounding import AuthorizedDocument, AuthorizedScope
from app.schemas.indexing import IndexDocumentCommand
from app.services.indexing import DocumentIndexWorker

pytestmark = pytest.mark.skipif(
    os.environ.get("STUDYFLOW_RUN_POSTGRES_INTEGRATION") != "1",
    reason="set STUDYFLOW_RUN_POSTGRES_INTEGRATION=1 to test a local pgvector database",
)


class SyntheticPdfDownloader:
    """Return an in-memory, text-layer PDF without reading user documents."""

    async def download(self, *, signed_url: str, max_bytes: int) -> bytes:
        """Build the synthetic PDF.

        Args:
            signed_url: HTTPS placeholder required by the indexing contract.
            max_bytes: Maximum accepted payload size.

        Returns:
            A two-page synthetic PDF containing Vietnamese learning text.

        Raises:
            ValueError: If the URL or size limit violates the downloader contract.
        """

        if not signed_url.startswith("https://") or max_bytes < 1:
            raise ValueError("valid HTTPS URL and positive max_bytes are required")
        output = BytesIO()
        document = canvas.Canvas(output)
        document.drawString(72, 760, "Trang mot: hoc tap gan voi thuc hanh va tu hoc chu dong.")
        document.showPage()
        document.drawString(72, 760, "Trang hai: noi dung rieng de kiem tra gioi han truy xuat.")
        document.showPage()
        document.save()
        payload = output.getvalue()
        if len(payload) > max_bytes:
            raise ValueError("synthetic PDF exceeds max_bytes")
        return payload


class DeterministicEmbeddingClient:
    """Create orthogonal 1024-dimensional vectors for deterministic retrieval."""

    async def embed(self, texts: tuple[str, ...]) -> tuple[tuple[float, ...], ...]:
        """Embed synthetic chunks without calling an external model.

        Args:
            texts: Non-empty text chunks extracted from the synthetic PDF.

        Returns:
            One 1024-dimensional vector per chunk.

        Raises:
            ValueError: If no text is supplied.
        """

        if not texts:
            raise ValueError("texts must not be empty")
        vectors = []
        for position, _value in enumerate(texts):
            vector = [0.0] * 1024
            vector[min(position, 1023)] = 1.0
            vectors.append(tuple(vector))
        return tuple(vectors)


@pytest.mark.anyio
async def test_real_pgvector_index_is_idempotent_and_scope_filtered() -> None:
    """Index a synthetic PDF twice and retrieve only its authorized first page."""

    database_url = os.environ.get("AI_DATABASE_URL")
    if not database_url:
        pytest.fail("AI_DATABASE_URL is required when PostgreSQL integration is enabled")

    engine = create_engine(database_url, pool_pre_ping=True)
    document_id = uuid4()
    actor_id = uuid4()
    command = IndexDocumentCommand(
        request_id="req_pgvector_integration",
        idempotency_key=f"integration-{document_id}",
        document_id=document_id,
        document_version=1,
        owner_id=actor_id,
        source_type=SourceType.PERSONAL_PDF,
        pipeline_version="integration-pdf-v1",
        signed_url="https://storage.invalid/synthetic-integration.pdf",
        mime_type="application/pdf",
    )

    try:
        with Session(engine) as session:
            assert session.scalar(
                text("SELECT extversion FROM pg_extension WHERE extname='vector'")
            )
            column_type = session.scalar(
                text(
                    "SELECT format_type(a.atttypid, a.atttypmod) "
                    "FROM pg_attribute a "
                    "JOIN pg_class c ON c.oid = a.attrelid "
                    "JOIN pg_namespace n ON n.oid = c.relnamespace "
                    "WHERE n.nspname='ai' AND c.relname='document_chunks' "
                    "AND a.attname='embedding'"
                )
            )
            assert column_type == "vector(1024)"
            index_method = session.scalar(
                text(
                    "SELECT am.amname FROM pg_index i "
                    "JOIN pg_class idx ON idx.oid=i.indexrelid "
                    "JOIN pg_am am ON am.oid=idx.relam "
                    "JOIN pg_namespace n ON n.oid=idx.relnamespace "
                    "WHERE n.nspname='ai' "
                    "AND idx.relname='ix_ai_document_chunks_embedding_hnsw'"
                )
            )
            assert index_method == "hnsw"
            assert (
                session.scalar(text("SELECT has_schema_privilege(current_user, 'app', 'USAGE')"))
                is False
            )

            worker = DocumentIndexWorker(
                download_client=SyntheticPdfDownloader(),
                embedding_client=DeterministicEmbeddingClient(),
                index_repository=SqlAlchemyDocumentIndexRepository(session),
                embedding_model="openai/text-embedding-3-large",
                embedding_batch_size=8,
            )
            first_artifact = await worker.execute(command)
            second_artifact = await worker.execute(command)
            session.commit()

            assert first_artifact.chunk_count == 2
            assert second_artifact.chunk_count == 2
            stored_chunk_count = session.scalar(
                text("SELECT count(*) FROM ai.document_chunks WHERE document_id=:document_id"),
                {"document_id": document_id},
            )
            assert stored_chunk_count == 2

            query_vector = tuple([1.0] + [0.0] * 1023)
            scope = AuthorizedScope(
                actor_id=actor_id,
                documents=(
                    AuthorizedDocument(
                        document_id=document_id,
                        document_version=1,
                        owner_id=actor_id,
                        source_type=SourceType.PERSONAL_PDF,
                        allowed_pages=(1,),
                    ),
                ),
                current_document_id=document_id,
                current_page_number=1,
            )
            evidence = PgVectorChunkRepository(session).search(
                query_text="Trang mot",
                query_embedding=query_vector,
                scope=scope,
                limit=5,
            )

            assert len(evidence) == 1
            assert evidence[0].document_id == document_id
            assert evidence[0].page_number == 1
            assert "Trang mot" in evidence[0].excerpt
    finally:
        with Session(engine) as cleanup_session:
            cleanup_session.execute(
                delete(DocumentIndex).where(DocumentIndex.document_id == document_id)
            )
            cleanup_session.commit()
        engine.dispose()
