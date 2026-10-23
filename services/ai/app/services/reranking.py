"""LangChain-backed deterministic reranking for grounded evidence."""

import re
from typing import TypedDict

from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda

from app.schemas.grounding import AuthorizedScope, RetrievedEvidence


class RerankInput(TypedDict):
    """Validated input passed through the LangChain runnable."""

    query: str
    evidence: tuple[RetrievedEvidence, ...]
    scope: AuthorizedScope
    limit: int


class LangChainEvidenceReranker:
    """Rerank hybrid candidates by grounding, query coverage, page context, and diversity."""

    def __init__(self, *, diversity_penalty: float = 0.15) -> None:
        """Create the deterministic LangChain reranking stage.

        Args:
            diversity_penalty: Penalty in 0..0.5 for selecting near-duplicate chunks.

        Returns:
            None.

        Raises:
            ValueError: If the diversity penalty is outside the supported range.
        """

        if not 0.0 <= diversity_penalty <= 0.5:
            raise ValueError("diversity_penalty must be between zero and 0.5")
        self._diversity_penalty = diversity_penalty
        self._pipeline = RunnableLambda(self._rerank_documents)

    def rerank(
        self,
        *,
        query: str,
        evidence: tuple[RetrievedEvidence, ...],
        scope: AuthorizedScope,
        limit: int,
    ) -> tuple[RetrievedEvidence, ...]:
        """Return a compact, diverse evidence set through a LangChain runnable.

        Args:
            query: Non-blank user question used for lexical coverage.
            evidence: Authorized hybrid candidates already ranked by RRF.
            scope: Immutable Java-authorized document and current-page context.
            limit: Final number of chunks, from 1 to the candidate count.

        Returns:
            Evidence reordered by deterministic relevance and diversity scores.

        Raises:
            ValueError: If the query or limit is invalid.
        """

        normalized_query = query.strip()
        if not normalized_query:
            raise ValueError("query must not be blank")
        if not 1 <= limit <= 50:
            raise ValueError("rerank limit must be between 1 and 50")
        if not evidence:
            return ()
        result = self._pipeline.invoke(
            RerankInput(
                query=normalized_query,
                evidence=evidence,
                scope=scope,
                limit=min(limit, len(evidence)),
            )
        )
        return tuple(result)

    def _rerank_documents(self, payload: RerankInput) -> tuple[RetrievedEvidence, ...]:
        """Execute the pure reranker used by the LangChain runnable.

        Args:
            payload: Query, hybrid candidates, scope, and final limit.

        Returns:
            Selected evidence with near-duplicate chunks penalized.

        Raises:
            None. Public validation occurs in :meth:`rerank`.
        """

        query_tokens = _tokens(payload["query"])
        documents = tuple(
            Document(
                page_content=item.excerpt,
                metadata={
                    "evidence_id": item.evidence_id,
                    "document_id": str(item.document_id),
                    "page_number": item.page_number,
                },
            )
            for item in payload["evidence"]
        )
        by_id = {item.evidence_id: item for item in payload["evidence"]}
        remaining: list[tuple[Document, float, frozenset[str]]] = []
        for document in documents:
            item = by_id[str(document.metadata["evidence_id"])]
            document_tokens = _tokens(document.page_content)
            coverage = (
                len(query_tokens & document_tokens) / len(query_tokens) if query_tokens else 0.0
            )
            current_page_bonus = 0.0
            if (
                payload["scope"].current_document_id == item.document_id
                and payload["scope"].current_page_number == item.page_number
            ):
                current_page_bonus = 0.05
            base_score = 0.80 * item.relevance_score + 0.15 * coverage + current_page_bonus
            remaining.append((document, base_score, document_tokens))

        selected: list[tuple[Document, frozenset[str]]] = []
        while remaining and len(selected) < payload["limit"]:
            best_index = max(
                range(len(remaining)),
                key=lambda index: (
                    remaining[index][1]
                    - self._diversity_penalty
                    * max(
                        (
                            _jaccard(remaining[index][2], selected_tokens)
                            for _, selected_tokens in selected
                        ),
                        default=0.0,
                    ),
                    by_id[str(remaining[index][0].metadata["evidence_id"])].relevance_score,
                ),
            )
            document, _, token_set = remaining.pop(best_index)
            selected.append((document, token_set))

        return tuple(by_id[str(document.metadata["evidence_id"])] for document, _ in selected)


def _tokens(value: str) -> frozenset[str]:
    """Tokenize multilingual text. Args: text. Returns: case-folded word set. Raises: none."""

    return frozenset(token for token in re.findall(r"\w+", value.casefold()) if len(token) > 1)


def _jaccard(left: frozenset[str], right: frozenset[str]) -> float:
    """Measure token overlap. Args: two token sets. Returns: 0..1 score. Raises: none."""

    union = left | right
    return len(left & right) / len(union) if union else 0.0
