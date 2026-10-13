"""Authorized pgvector retrieval repository."""

from typing import Protocol

from sqlalchemy import and_, case, or_, select
from sqlalchemy.orm import Session

from app.repositories.models import DocumentChunk, DocumentIndex, IndexStatus
from app.schemas.grounding import AuthorizedScope, RetrievedEvidence


class ChunkRepository(Protocol):
    """Contract for retrieving chunks only from a caller-authorized scope."""

    def search(
        self,
        *,
        query_embedding: tuple[float, ...],
        scope: AuthorizedScope,
        limit: int,
    ) -> tuple[RetrievedEvidence, ...]:
        """Search active chunk indexes within an authorized scope.

        Args:
            query_embedding: Query vector using the active index dimensions.
            scope: Documents, versions, owners, and pages authorized by Java.
            limit: Maximum number of chunks to return.

        Returns:
            Evidence ordered by current-page preference then cosine relevance.

        Raises:
            ValueError: If the vector or limit is invalid.
            sqlalchemy.exc.SQLAlchemyError: If PostgreSQL search fails.
        """

    def collect(self, *, scope: AuthorizedScope, limit: int) -> tuple[RetrievedEvidence, ...]:
        """Read authorized chunks in page order for summaries.

        Args: scope: Java's allow-list; limit: positive maximum chunk count.
        Returns: Ordered chunks without semantic top-k truncation.
        Raises: ValueError for limits; database errors for unavailable storage.
        """


class PgVectorChunkRepository:
    """SQLAlchemy implementation that applies scope before vector ranking."""

    def __init__(
        self,
        session: Session,
        *,
        embedding_dimensions: int = 1024,
        embedding_model: str = "openai/text-embedding-3-large",
        minimum_relevance: float = 0.3,
    ) -> None:
        """Create a repository bound to one transaction-scoped session.

        Args:
            session: Open SQLAlchemy session for the AI-owned schema.
            embedding_dimensions: Required query vector length.
            embedding_model: Model ID shared by query embeddings and stored indexes.
            minimum_relevance: Minimum cosine similarity before page preference and limit.

        Returns:
            None.

        Raises:
            ValueError: If embedding_dimensions is not positive.
        """

        if embedding_dimensions < 1:
            raise ValueError("embedding_dimensions must be positive")
        if not 0 <= minimum_relevance <= 1:
            raise ValueError("minimum relevance must be between zero and one")
        self._session = session
        self._embedding_dimensions = embedding_dimensions
        self._embedding_model = embedding_model
        self._minimum_relevance = minimum_relevance

    def search(
        self,
        *,
        query_embedding: tuple[float, ...],
        scope: AuthorizedScope,
        limit: int,
    ) -> tuple[RetrievedEvidence, ...]:
        """Search active indexes using mandatory document-level filters.

        Args:
            query_embedding: Query vector with exactly the configured dimensions.
            scope: Immutable scope granted by Java for this request.
            limit: Maximum number of evidence chunks, between 1 and 50.

        Returns:
            Authorized evidence ordered by page preference and cosine relevance.

        Raises:
            ValueError: If dimensions or limit are invalid.
            sqlalchemy.exc.SQLAlchemyError: If database execution fails.
        """

        if len(query_embedding) != self._embedding_dimensions:
            raise ValueError("query embedding has unexpected dimensions")
        if not 1 <= limit <= 50:
            raise ValueError("limit must be between 1 and 50")

        scope_clauses = []
        for document in scope.documents:
            clause = and_(
                DocumentChunk.document_id == document.document_id,
                DocumentChunk.document_version == document.document_version,
                DocumentChunk.source_type == document.source_type.value,
            )
            if document.owner_id is not None:
                clause = and_(clause, DocumentChunk.owner_id == document.owner_id)
            if document.allowed_pages is not None:
                clause = and_(clause, DocumentChunk.page_number.in_(document.allowed_pages))
            scope_clauses.append(clause)

        distance = DocumentChunk.embedding.cosine_distance(list(query_embedding))
        current_page_rank = case(
            (
                and_(
                    DocumentChunk.document_id == scope.current_document_id,
                    DocumentChunk.page_number == scope.current_page_number,
                ),
                0,
            ),
            else_=1,
        )
        statement = (
            select(DocumentChunk, distance.label("distance"))
            .join(DocumentIndex, DocumentChunk.index_id == DocumentIndex.id)
            .where(
                DocumentIndex.status == IndexStatus.ACTIVE.value,
                DocumentIndex.embedding_model == self._embedding_model,
                DocumentIndex.embedding_dimensions == self._embedding_dimensions,
                distance <= 1.0 - self._minimum_relevance,
                or_(*scope_clauses),
            )
            .order_by(current_page_rank, distance)
            .limit(limit)
        )
        rows = self._session.execute(statement).all()
        return tuple(
            RetrievedEvidence(
                evidence_id=f"chunk:{chunk.id}",
                document_id=chunk.document_id,
                document_version=chunk.document_version,
                owner_id=chunk.owner_id,
                source_type=chunk.source_type,
                page_number=chunk.page_number,
                chunk_index=chunk.chunk_index,
                excerpt=chunk.content,
                relevance_score=max(0.0, min(1.0, 1.0 - float(distance_value))),
            )
            for chunk, distance_value in rows
        )

    def collect(self, *, scope: AuthorizedScope, limit: int) -> tuple[RetrievedEvidence, ...]:
        """Read pages sequentially. Args: scope and positive limit. Returns: chunks.

        Raises: ValueError for invalid limits; SQLAlchemyError on database failure.
        """
        if not 1 <= limit <= 201:
            raise ValueError("collection limit must be between 1 and 201")
        clauses = []
        for document in scope.documents:
            clause = and_(
                DocumentChunk.document_id == document.document_id,
                DocumentChunk.document_version == document.document_version,
                DocumentChunk.source_type == document.source_type.value,
            )
            if document.owner_id is not None:
                clause = and_(clause, DocumentChunk.owner_id == document.owner_id)
            if document.allowed_pages is not None:
                clause = and_(clause, DocumentChunk.page_number.in_(document.allowed_pages))
            clauses.append(clause)
        rows = self._session.scalars(
            select(DocumentChunk)
            .join(DocumentIndex, DocumentChunk.index_id == DocumentIndex.id)
            .where(
                DocumentIndex.status == IndexStatus.ACTIVE.value,
                DocumentIndex.embedding_model == self._embedding_model,
                DocumentIndex.embedding_dimensions == self._embedding_dimensions,
                or_(*clauses),
            )
            .order_by(
                DocumentChunk.document_id, DocumentChunk.page_number, DocumentChunk.chunk_index
            )
            .limit(limit)
        ).all()
        return tuple(
            RetrievedEvidence(
                evidence_id=f"chunk:{chunk.id}",
                document_id=chunk.document_id,
                document_version=chunk.document_version,
                owner_id=chunk.owner_id,
                source_type=chunk.source_type,
                page_number=chunk.page_number,
                chunk_index=chunk.chunk_index,
                excerpt=chunk.content,
                relevance_score=1.0,
            )
            for chunk in rows
        )
