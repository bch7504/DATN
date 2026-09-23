"""Static and validation tests for M1 pgvector persistence contracts."""

import pytest

from app.core.config import Settings
from app.core.errors import ServiceError
from app.models import DocumentChunkModel, IndexJobModel
from app.repositories.indexes import ChunkDraft, DocumentIndexRepository


class NoIoSession:
    """Session fixture that fails if validation unexpectedly reaches persistence."""

    def add(self, value: object) -> None:
        """Args: unexpected value. Returns: None. Raises: AssertionError."""
        raise AssertionError(f"unexpected persistence: {type(value).__name__}")


def _chunk(index: int, dimensions: int = 1024) -> ChunkDraft:
    """Args: chunk index/dimensions. Returns: synthetic Personal chunk. Raises: none."""
    return ChunkDraft(
        owner_id="fixture-owner",
        source_type="PERSONAL_RAG",
        page_number=1,
        slide_number=None,
        chunk_index=index,
        content="Synthetic academic content",
        embedding=[0.0] * dimensions,
    )


def test_database_metadata_enforces_job_and_chunk_uniqueness() -> None:
    """Args: none. Returns: None. Raises: AssertionError on constraint drift."""
    job_constraints = {constraint.name for constraint in IndexJobModel.__table__.constraints}
    chunk_constraints = {constraint.name for constraint in DocumentChunkModel.__table__.constraints}
    assert "uq_ai_job_idempotency" in job_constraints
    assert "uq_ai_chunk_version_index" in chunk_constraints
    assert DocumentChunkModel.__table__.c.embedding.type.dim == 1024


def test_repository_rejects_duplicate_chunk_indexes_before_io() -> None:
    """Args: none. Returns: None. Raises: AssertionError if duplicate reaches DB."""
    repository = DocumentIndexRepository(NoIoSession(), Settings())  # type: ignore[arg-type]
    with pytest.raises(ServiceError, match="Chunk indexes must be unique"):
        repository.stage_version(
            document_id="fixture-doc",
            document_version=1,
            pipeline_type="PERSONAL_RAG",
            chunks=[_chunk(0), _chunk(0)],
        )


def test_repository_rejects_wrong_vector_dimensions_before_io() -> None:
    """Args: none. Returns: None. Raises: AssertionError if malformed vector reaches DB."""
    repository = DocumentIndexRepository(NoIoSession(), Settings())  # type: ignore[arg-type]
    with pytest.raises(ServiceError, match="Embedding dimensions do not match"):
        repository.stage_version(
            document_id="fixture-doc",
            document_version=1,
            pipeline_type="PERSONAL_RAG",
            chunks=[_chunk(0, dimensions=3)],
        )
