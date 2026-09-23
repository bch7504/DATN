"""Versioned pgvector index persistence primitives."""

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import delete, update
from sqlalchemy.orm import Session

from app.core.config import Settings, settings
from app.core.errors import ServiceError
from app.models import DocumentChunkModel, DocumentIndexModel


@dataclass(frozen=True)
class ChunkDraft:
    """Validated page/slide chunk ready for one atomic version write."""

    owner_id: str | None
    source_type: str
    page_number: int | None
    slide_number: int | None
    chunk_index: int
    content: str
    embedding: list[float]


class DocumentIndexRepository:
    """Write and activate versioned document chunks in schema `ai`."""

    def __init__(self, session: Session, config: Settings = settings) -> None:
        """Create the repository.

        Args:
            session: Python-owned transactional SQLAlchemy session.
            config: Embedding model/dimension configuration for index metadata.
        Returns:
            None. Stores dependencies without performing I/O.
        Raises:
            None.
        """
        self._session = session
        self._config = config

    def stage_version(
        self,
        *,
        document_id: str,
        document_version: int,
        pipeline_type: str,
        chunks: list[ChunkDraft],
    ) -> DocumentIndexModel:
        """Persist one inactive index version and all uniquely numbered chunks.

        Args:
            document_id: Authorized Java document identifier.
            document_version: Immutable positive document version.
            pipeline_type: PERSONAL_RAG or TEACHER_SLIDE.
            chunks: Fully extracted/embedded chunks from a later M2 processor.
        Returns:
            DocumentIndexModel: Staged index with status STAGING.
        Raises:
            ServiceError: Invalid/duplicate chunk index or vector dimension.
            sqlalchemy.exc.SQLAlchemyError: Atomic transaction failure.
        """
        if not chunks:
            raise ServiceError("EMPTY_INDEX", "Document index requires at least one chunk", 422)
        indexes = [chunk.chunk_index for chunk in chunks]
        if len(set(indexes)) != len(indexes):
            raise ServiceError("DUPLICATE_CHUNK", "Chunk indexes must be unique per version", 422)
        if any(len(chunk.embedding) != self._config.embedding_dimensions for chunk in chunks):
            raise ServiceError("INVALID_VECTOR_DIMENSIONS", "Embedding dimensions do not match index", 422)

        index = DocumentIndexModel(
            document_id=document_id,
            document_version=document_version,
            pipeline_type=pipeline_type,
            embedding_model=self._config.openrouter_embedding_model,
            dimensions=self._config.embedding_dimensions,
            status="STAGING",
        )
        self._session.add(index)
        self._session.add_all(
            [
                DocumentChunkModel(
                    document_id=document_id,
                    document_version=document_version,
                    owner_id=chunk.owner_id,
                    source_type=chunk.source_type,
                    page_number=chunk.page_number,
                    slide_number=chunk.slide_number,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    embedding=chunk.embedding,
                )
                for chunk in chunks
            ]
        )
        self._session.commit()
        self._session.refresh(index)
        return index

    def activate_version(self, index: DocumentIndexModel) -> None:
        """Atomically make one complete version active and retire previous versions.

        Args:
            index: Staged index row returned by `stage_version`.
        Returns:
            None. Updates activation state in one transaction.
        Raises:
            ServiceError: Index is not in STAGING state.
        """
        if index.status != "STAGING":
            raise ServiceError("INVALID_INDEX_STATE", "Only a staged index can be activated", 409)
        self._session.execute(
            update(DocumentIndexModel)
            .where(
                DocumentIndexModel.document_id == index.document_id,
                DocumentIndexModel.pipeline_type == index.pipeline_type,
                DocumentIndexModel.id != index.id,
                DocumentIndexModel.status == "ACTIVE",
            )
            .values(status="RETIRED")
        )
        index.status = "ACTIVE"
        index.activated_at = datetime.now(UTC)
        self._session.commit()

    def delete_version(self, document_id: str, document_version: int, pipeline_type: str) -> None:
        """Remove one authorized index version and its chunks.

        Args:
            document_id: Java document identifier.
            document_version: Exact version to remove.
            pipeline_type: Source pipeline used to constrain index metadata.
        Returns:
            None. Deletes chunks before version metadata in one transaction.
        Raises:
            sqlalchemy.exc.SQLAlchemyError: Delete transaction failure.
        """
        self._session.execute(
            delete(DocumentChunkModel).where(
                DocumentChunkModel.document_id == document_id,
                DocumentChunkModel.document_version == document_version,
            )
        )
        self._session.execute(
            delete(DocumentIndexModel).where(
                DocumentIndexModel.document_id == document_id,
                DocumentIndexModel.document_version == document_version,
                DocumentIndexModel.pipeline_type == pipeline_type,
            )
        )
        self._session.commit()
