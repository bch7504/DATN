"""Authorized pgvector retrieval repository."""

from typing import Protocol

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.repositories.models import DocumentChunk, DocumentIndex, IndexStatus
from app.schemas.grounding import AuthorizedScope, RetrievedEvidence


class ChunkRepository(Protocol):
    """Contract for retrieving chunks only from a caller-authorized scope."""

    def search(
        self,
        *,
        query_text: str,
        query_embedding: tuple[float, ...],
        scope: AuthorizedScope,
        limit: int,
    ) -> tuple[RetrievedEvidence, ...]:
        """Search active chunk indexes within an authorized scope.

        Args:
            query_text: Non-blank natural-language query used by PostgreSQL full-text search.
            query_embedding: Query vector using the active index dimensions.
            scope: Documents, versions, owners, and pages authorized by Java.
            limit: Maximum number of chunks to return.

        Returns:
            Evidence ordered by hybrid reciprocal-rank fusion.

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
        rrf_k: int = 60,
        vector_weight: float = 0.55,
        keyword_weight: float = 0.35,
        current_page_weight: float = 0.10,
    ) -> None:
        """Create a repository bound to one transaction-scoped session.

        Args:
            session: Open SQLAlchemy session for the AI-owned schema.
            embedding_dimensions: Required query vector length.
            embedding_model: Model ID shared by query embeddings and stored indexes.
            minimum_relevance: Minimum cosine similarity before page preference and limit.
            rrf_k: Positive reciprocal-rank-fusion smoothing constant.
            vector_weight: Relative contribution of semantic vector rank.
            keyword_weight: Relative contribution of full-text rank.
            current_page_weight: Small rank contribution for the active Tutor page.

        Returns:
            None.

        Raises:
            ValueError: If embedding_dimensions is not positive.
        """

        if embedding_dimensions < 1:
            raise ValueError("embedding_dimensions must be positive")
        if not 0 <= minimum_relevance <= 1:
            raise ValueError("minimum relevance must be between zero and one")
        if rrf_k < 1:
            raise ValueError("rrf_k must be positive")
        if min(vector_weight, keyword_weight, current_page_weight) < 0:
            raise ValueError("retrieval weights must not be negative")
        if vector_weight + keyword_weight <= 0:
            raise ValueError("at least one retrieval signal must be enabled")
        self._session = session
        self._embedding_dimensions = embedding_dimensions
        self._embedding_model = embedding_model
        self._minimum_relevance = minimum_relevance
        self._rrf_k = rrf_k
        self._vector_weight = vector_weight
        self._keyword_weight = keyword_weight
        self._current_page_weight = current_page_weight

    def search(
        self,
        *,
        query_text: str,
        query_embedding: tuple[float, ...],
        scope: AuthorizedScope,
        limit: int,
    ) -> tuple[RetrievedEvidence, ...]:
        """Search active indexes using mandatory document-level filters.

        Args:
            query_text: Non-blank query used for the keyword retrieval leg.
            query_embedding: Query vector with exactly the configured dimensions.
            scope: Immutable scope granted by Java for this request.
            limit: Maximum number of evidence chunks, between 1 and 50.

        Returns:
            Authorized evidence ordered by vector/keyword RRF plus current-page preference.

        Raises:
            ValueError: If dimensions or limit are invalid.
            sqlalchemy.exc.SQLAlchemyError: If database execution fails.
        """

        normalized_query = query_text.strip()
        if not normalized_query:
            raise ValueError("query_text must not be blank")
        if len(query_embedding) != self._embedding_dimensions:
            raise ValueError("query embedding has unexpected dimensions")
        if not 1 <= limit <= 100:
            raise ValueError("limit must be between 1 and 100")

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
        vector_statement = (
            select(DocumentChunk, distance.label("distance"))
            .join(DocumentIndex, DocumentChunk.index_id == DocumentIndex.id)
            .where(
                DocumentIndex.status == IndexStatus.ACTIVE.value,
                DocumentIndex.embedding_model == self._embedding_model,
                DocumentIndex.embedding_dimensions == self._embedding_dimensions,
                distance <= 1.0 - self._minimum_relevance,
                or_(*scope_clauses),
            )
            .order_by(distance)
            .limit(limit)
        )
        text_query = func.websearch_to_tsquery("simple", normalized_query)
        keyword_rank = func.ts_rank_cd(DocumentChunk.search_vector, text_query)
        keyword_statement = (
            select(DocumentChunk, keyword_rank.label("keyword_rank"))
            .join(DocumentIndex, DocumentChunk.index_id == DocumentIndex.id)
            .where(
                DocumentIndex.status == IndexStatus.ACTIVE.value,
                DocumentIndex.embedding_model == self._embedding_model,
                DocumentIndex.embedding_dimensions == self._embedding_dimensions,
                DocumentChunk.search_vector.bool_op("@@")(text_query),
                or_(*scope_clauses),
            )
            .order_by(keyword_rank.desc())
            .limit(limit)
        )

        fused: dict[int, dict[str, object]] = {}
        for rank, (chunk, distance_value) in enumerate(
            self._session.execute(vector_statement).all(), start=1
        ):
            semantic_score = max(0.0, min(1.0, 1.0 - float(distance_value)))
            fused[chunk.id] = {
                "chunk": chunk,
                "score": self._vector_weight / (self._rrf_k + rank),
                "semantic_score": semantic_score,
                "keyword_score": 0.0,
            }
        for rank, (chunk, keyword_value) in enumerate(
            self._session.execute(keyword_statement).all(), start=1
        ):
            entry = fused.setdefault(
                chunk.id,
                {
                    "chunk": chunk,
                    "score": 0.0,
                    "semantic_score": 0.0,
                    "keyword_score": 0.0,
                },
            )
            entry["score"] = float(entry["score"]) + self._keyword_weight / (self._rrf_k + rank)
            entry["keyword_score"] = float(keyword_value)

        max_rrf_score = (self._vector_weight + self._keyword_weight + self._current_page_weight) / (
            self._rrf_k + 1
        )
        for entry in fused.values():
            chunk = entry["chunk"]
            if (
                scope.current_document_id is not None
                and chunk.document_id == scope.current_document_id
                and chunk.page_number == scope.current_page_number
            ):
                entry["score"] = float(entry["score"]) + self._current_page_weight / (
                    self._rrf_k + 1
                )

        ordered = sorted(
            fused.values(),
            key=lambda entry: (
                float(entry["score"]),
                float(entry["semantic_score"]),
                float(entry["keyword_score"]),
            ),
            reverse=True,
        )
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
                relevance_score=max(
                    0.0,
                    min(1.0, float(entry["score"]) / max_rrf_score),
                ),
            )
            for entry in ordered
            for chunk in (entry["chunk"],)
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
