"""Persistence contract and SQLAlchemy implementation for document indexes."""

from datetime import datetime
from typing import Protocol

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.repositories.document_lock import lock_document_version
from app.repositories.models import DocumentChunk, DocumentIndex, IndexStatus
from app.schemas.indexing import IndexArtifact, IndexDocumentCommand, IndexedChunk


class DocumentIndexRepository(Protocol):
    """Contract for atomically activating one document index version."""

    def replace_index(
        self,
        *,
        command: IndexDocumentCommand,
        chunks: tuple[IndexedChunk, ...],
        artifact: IndexArtifact,
    ) -> None:
        """Replace a failed/building index and activate the completed version.

        Args:
            command: Immutable document identity and pipeline version.
            chunks: Page-bounded text and embeddings to persist atomically.
            artifact: Safe metadata describing the completed index.

        Returns:
            None.

        Raises:
            ValueError: If input is inconsistent.
            sqlalchemy.exc.SQLAlchemyError: If persistence fails; caller rolls
                back and marks the job failed.
        """


class SqlAlchemyDocumentIndexRepository:
    """Atomically replace one index and supersede older active pipelines."""

    def __init__(self, session: Session) -> None:
        """Create a repository bound to a caller-owned transaction.

        Args:
            session: Open SQLAlchemy session for the AI-owned schema.

        Returns:
            None.

        Raises:
            None.
        """

        self._session = session

    def replace_index(
        self,
        *,
        command: IndexDocumentCommand,
        chunks: tuple[IndexedChunk, ...],
        artifact: IndexArtifact,
    ) -> None:
        """Persist all chunks and activate exactly one pipeline version.

        Args:
            command: Immutable document and pipeline identity.
            chunks: Complete page-bounded chunks and vectors.
            artifact: Model and dimension metadata for the completed index.

        Returns:
            None. Changes remain in the caller-owned transaction.

        Raises:
            ValueError: If chunks or artifact are inconsistent.
            sqlalchemy.exc.SQLAlchemyError: If database operations fail.
        """

        _validate_index_payload(command=command, chunks=chunks, artifact=artifact)
        lock_document_version(
            self._session, document_id=command.document_id, version=command.document_version
        )
        existing = self._session.scalar(
            select(DocumentIndex)
            .where(
                DocumentIndex.document_id == command.document_id,
                DocumentIndex.document_version == command.document_version,
                DocumentIndex.pipeline_version == command.pipeline_version,
            )
            .with_for_update()
        )
        if existing is None:
            existing = DocumentIndex(
                document_id=command.document_id,
                document_version=command.document_version,
                owner_id=command.owner_id,
                source_type=command.source_type.value,
                pipeline_version=command.pipeline_version,
                embedding_model=artifact.embedding_model,
                embedding_dimensions=artifact.embedding_dimensions,
                status=IndexStatus.BUILDING.value,
            )
            self._session.add(existing)
            self._session.flush()
        else:
            if (
                existing.embedding_model != artifact.embedding_model
                or existing.embedding_dimensions != artifact.embedding_dimensions
                or existing.owner_id != command.owner_id
                or existing.source_type != command.source_type.value
            ):
                raise ValueError("Index identity/model changed; use a new pipeline version")
            existing.owner_id = command.owner_id
            existing.source_type = command.source_type.value
            existing.embedding_model = artifact.embedding_model
            existing.embedding_dimensions = artifact.embedding_dimensions
            existing.status = IndexStatus.BUILDING.value
            existing.activated_at = None
            self._session.execute(
                delete(DocumentChunk).where(DocumentChunk.index_id == existing.id)
            )

        self._session.execute(
            update(DocumentIndex)
            .where(
                DocumentIndex.document_id == command.document_id,
                DocumentIndex.document_version == command.document_version,
                DocumentIndex.id != existing.id,
                DocumentIndex.status == IndexStatus.ACTIVE.value,
            )
            .values(status=IndexStatus.SUPERSEDED.value)
        )
        self._session.add_all(
            [
                DocumentChunk(
                    index_id=existing.id,
                    document_id=command.document_id,
                    document_version=command.document_version,
                    owner_id=command.owner_id,
                    source_type=command.source_type.value,
                    page_number=item.chunk.page_number,
                    chunk_index=item.chunk.chunk_index,
                    content=item.chunk.text,
                    embedding=list(item.embedding),
                )
                for item in chunks
            ]
        )
        existing.status = IndexStatus.ACTIVE.value
        existing.activated_at = _database_now(self._session)
        self._session.flush()


def _database_now(session: Session) -> datetime:
    """Read the transaction-consistent database timestamp.

    Args:
        session: Open SQLAlchemy session.

    Returns:
        Timezone-aware database timestamp.

    Raises:
        sqlalchemy.exc.SQLAlchemyError: If the scalar query fails.
    """

    value = session.scalar(select(func.now()))
    if not isinstance(value, datetime):
        raise RuntimeError("database did not return a timestamp")
    return value


def _validate_index_payload(
    *,
    command: IndexDocumentCommand,
    chunks: tuple[IndexedChunk, ...],
    artifact: IndexArtifact,
) -> None:
    """Validate a complete index payload before changing database state.

    Args:
        command: Document and pipeline identity.
        chunks: Complete chunk/vector payload.
        artifact: Metadata expected to match the payload.

    Returns:
        None.

    Raises:
        ValueError: If counts, dimensions, pipeline, or indices disagree.
    """

    if not chunks or artifact.chunk_count != len(chunks):
        raise ValueError("artifact chunk count must match non-empty chunks")
    if artifact.pipeline_version != command.pipeline_version:
        raise ValueError("artifact pipeline version does not match command")
    chunk_indices = tuple(item.chunk.chunk_index for item in chunks)
    if chunk_indices != tuple(range(len(chunks))):
        raise ValueError("chunk indices must be unique, contiguous, and zero-based")
    if any(len(item.embedding) != artifact.embedding_dimensions for item in chunks):
        raise ValueError("chunk embedding dimensions do not match artifact")
