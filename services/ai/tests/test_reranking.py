"""Verify the LangChain reranking stage remains grounded and diverse."""

from uuid import UUID

import pytest

from app.repositories.models import SourceType
from app.schemas.grounding import AuthorizedDocument, AuthorizedScope, RetrievedEvidence
from app.services.reranking import LangChainEvidenceReranker

ACTOR_ID = UUID("10000000-0000-0000-0000-000000000001")
DOCUMENT_ID = UUID("20000000-0000-0000-0000-000000000001")


def _scope(*, current_page: int | None = None) -> AuthorizedScope:
    """Create a synthetic authorized scope.

    Args:
        current_page: Optional page selected in the PDF viewer.

    Returns:
        One-document scope owned by the synthetic actor.

    Raises:
        pydantic.ValidationError: If the fixture becomes invalid.
    """

    return AuthorizedScope(
        actor_id=ACTOR_ID,
        documents=(
            AuthorizedDocument(
                document_id=DOCUMENT_ID,
                document_version=1,
                owner_id=ACTOR_ID,
                source_type=SourceType.PERSONAL_PDF,
            ),
        ),
        current_document_id=DOCUMENT_ID if current_page is not None else None,
        current_page_number=current_page,
    )


def _evidence(evidence_id: str, page: int, excerpt: str, score: float) -> RetrievedEvidence:
    """Create one synthetic authorized retrieval candidate.

    Args:
        evidence_id: Stable candidate identifier.
        page: One-based PDF page number.
        excerpt: Synthetic page text.
        score: Hybrid relevance score in the inclusive range 0..1.

    Returns:
        Validated retrieval evidence.

    Raises:
        pydantic.ValidationError: If a fixture argument violates the contract.
    """

    return RetrievedEvidence(
        evidence_id=evidence_id,
        document_id=DOCUMENT_ID,
        document_version=1,
        owner_id=ACTOR_ID,
        source_type=SourceType.PERSONAL_PDF,
        page_number=page,
        chunk_index=0,
        excerpt=excerpt,
        relevance_score=score,
    )


def test_reranker_prefers_relevant_diverse_evidence_over_duplicate_chunks() -> None:
    """Near-duplicate chunks must not consume the complete final context window."""

    first = _evidence("chunk:1", 1, "ACID isolation transaction", 0.90)
    duplicate = _evidence("chunk:2", 2, "ACID isolation transaction", 0.89)
    complementary = _evidence("chunk:3", 3, "Isolation level serializable prevents anomalies", 0.78)

    result = LangChainEvidenceReranker(diversity_penalty=0.5).rerank(
        query="ACID isolation",
        evidence=(first, duplicate, complementary),
        scope=_scope(),
        limit=2,
    )

    assert tuple(item.evidence_id for item in result) == ("chunk:1", "chunk:3")


def test_reranker_uses_current_page_only_as_a_bounded_preference() -> None:
    """Current-page context may reorder close candidates without bypassing retrieval."""

    nearby = _evidence("chunk:1", 1, "Boolean algebra and logic gate", 0.76)
    current = _evidence("chunk:2", 4, "Boolean algebra expression", 0.75)

    result = LangChainEvidenceReranker().rerank(
        query="Boolean algebra",
        evidence=(nearby, current),
        scope=_scope(current_page=4),
        limit=1,
    )

    assert result == (current,)


def test_reranker_rejects_blank_query_and_invalid_limit() -> None:
    """Invalid caller input must fail before entering the LangChain runnable."""

    reranker = LangChainEvidenceReranker()
    evidence = (_evidence("chunk:1", 1, "Synthetic evidence", 0.8),)

    with pytest.raises(ValueError, match="query must not be blank"):
        reranker.rerank(query=" ", evidence=evidence, scope=_scope(), limit=1)
    with pytest.raises(ValueError, match="limit"):
        reranker.rerank(query="valid", evidence=evidence, scope=_scope(), limit=0)
