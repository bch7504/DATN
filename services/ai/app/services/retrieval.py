"""Embedding, authorized retrieval, and post-filter enforcement."""

import math

from app.clients.protocols import EmbeddingClient
from app.repositories.chunk_repository import ChunkRepository
from app.schemas.grounding import AuthorizedDocument, AuthorizedScope, RetrievedEvidence


class RetrievalService:
    """Retrieve evidence and reject repository results outside Java's scope."""

    def __init__(
        self,
        *,
        embedding_client: EmbeddingClient,
        chunk_repository: ChunkRepository,
        embedding_dimensions: int = 1024,
        minimum_relevance: float = 0.3,
    ) -> None:
        """Create an authorized retrieval service.

        Args:
            embedding_client: Provider used to embed the query.
            chunk_repository: Repository that applies scope before ranking.
            embedding_dimensions: Exact vector length required by the index.
            minimum_relevance: Inclusive relevance threshold in the range 0..1.

        Returns:
            None.

        Raises:
            ValueError: If dimensions or relevance threshold are invalid.
        """

        if embedding_dimensions < 1:
            raise ValueError("embedding_dimensions must be positive")
        if not 0.0 <= minimum_relevance <= 1.0:
            raise ValueError("minimum_relevance must be between zero and one")
        self._embedding_client = embedding_client
        self._chunk_repository = chunk_repository
        self._embedding_dimensions = embedding_dimensions
        self._minimum_relevance = minimum_relevance

    async def retrieve(
        self,
        *,
        query: str,
        scope: AuthorizedScope,
        limit: int = 8,
    ) -> tuple[RetrievedEvidence, ...]:
        """Embed a query and return only sufficiently relevant authorized evidence.

        Args:
            query: Non-blank question, summary instruction, or quiz topic.
            scope: Minimal immutable scope supplied by Java.
            limit: Maximum chunks requested from the repository, from 1 to 50.

        Returns:
            Post-filtered evidence in repository ranking order.

        Raises:
            ValueError: If input, vector dimensions, or repository output is invalid.
            RuntimeError: If the embedding provider fails.
        """

        normalized_query = query.strip()
        if not normalized_query:
            raise ValueError("query must not be blank")
        if not 1 <= limit <= 50:
            raise ValueError("limit must be between 1 and 50")

        vectors = await self._embedding_client.embed((normalized_query,))
        if len(vectors) != 1 or len(vectors[0]) != self._embedding_dimensions:
            raise ValueError("embedding provider returned unexpected dimensions")
        if any(not math.isfinite(value) for value in vectors[0]) or not any(vectors[0]):
            raise ValueError("embedding must contain finite values and have nonzero magnitude")
        candidates = self._chunk_repository.search(
            query_embedding=vectors[0],
            scope=scope,
            limit=limit,
        )
        return tuple(
            evidence
            for evidence in candidates
            if evidence.relevance_score >= self._minimum_relevance
            and _is_authorized(evidence, scope.documents)
        )

    def collect_for_summary(
        self, *, scope: AuthorizedScope, max_chunks: int = 50
    ) -> tuple[RetrievedEvidence, ...]:
        """Read the full bounded scope; never label top-k content a full summary.

        Args: scope: Java-approved pages; max_chunks: 1..200 context safety cap.
        Returns: All scoped evidence when it fits the cap, otherwise no partial output.
        Raises: ValueError if limits invalid or the user must narrow the page scope.
        """
        if not 1 <= max_chunks <= 200:
            raise ValueError("summary chunk limit must be between 1 and 200")
        chunks = self._chunk_repository.collect(scope=scope, limit=max_chunks + 1)
        if len(chunks) > max_chunks:
            raise ValueError("summary scope exceeds context budget; select fewer PDF pages")
        authorized = tuple(item for item in chunks if _is_authorized(item, scope.documents))
        if authorized and {item.document_id for item in authorized} != {
            document.document_id for document in scope.documents
        }:
            raise ValueError("Not all selected documents have readable indexed text")
        return authorized


def _is_authorized(
    evidence: RetrievedEvidence,
    documents: tuple[AuthorizedDocument, ...],
) -> bool:
    """Check one retrieved chunk against the immutable document allow-list.

    Args:
        evidence: Repository result to validate again after retrieval.
        documents: Document scopes granted by Java.

    Returns:
        True only when document, version, owner, type, and page all match.

    Raises:
        None.
    """

    for document in documents:
        if evidence.document_id != document.document_id:
            continue
        if evidence.document_version != document.document_version:
            continue
        if evidence.source_type is not document.source_type:
            continue
        if document.owner_id is not None and evidence.owner_id != document.owner_id:
            continue
        page_is_disallowed = (
            document.allowed_pages is not None
            and evidence.page_number not in document.allowed_pages
        )
        if page_is_disallowed:
            continue
        return True
    return False
