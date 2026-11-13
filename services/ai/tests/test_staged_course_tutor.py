"""Synthetic tests for ordered Slide Tutor fallback and authorization isolation."""

import asyncio
from uuid import UUID, uuid4

import pytest

from app.repositories.models import SourceType
from app.schemas.grounding import (
    AnswerStatus,
    AuthorizedDocument,
    AuthorizedScope,
    GeneratedAnswer,
    RetrievedEvidence,
)
from app.services.grounded_generation import GroundedAnswerService, _answer_scopes


class RecordingRetrieval:
    """Return synthetic evidence while recording each narrowed scope."""

    def __init__(self, evidence: tuple[RetrievedEvidence, ...]) -> None:
        """Args: synthetic chunks. Returns: None. Raises: None."""
        self.evidence = evidence
        self.scopes: list[AuthorizedScope] = []

    async def retrieve(
        self, *, query: str, scope: AuthorizedScope, limit: int = 8
    ) -> tuple[RetrievedEvidence, ...]:
        """Args: nonblank query, allowed scope, limit. Returns: scoped chunks. Raises: None."""
        assert query.strip()
        self.scopes.append(scope)
        return tuple(
            item
            for item in self.evidence
            if any(
                document.document_id == item.document_id
                and document.document_version == item.document_version
                and (document.allowed_pages is None or item.page_number in document.allowed_pages)
                for document in scope.documents
            )
        )[:limit]


class EvidenceOnlyAnswer:
    """Model a provider declining until the required explicit evidence is present."""

    def __init__(self, required_id: str) -> None:
        """Args: evidence ID needed to answer. Returns: None. Raises: None."""
        self.required_id = required_id
        self.calls = 0

    async def generate_answer(
        self, *, instruction: str, evidence: tuple[RetrievedEvidence, ...]
    ) -> GeneratedAnswer:
        """Args: question and scoped evidence. Returns: grounded answer or null. Raises: None."""
        assert instruction.strip()
        self.calls += 1
        if any(item.evidence_id == self.required_id for item in evidence):
            return GeneratedAnswer(
                answer="Giải thích từ bằng chứng đã cấp quyền.",
                cited_evidence_ids=(self.required_id,),
            )
        return GeneratedAnswer(answer=None, cited_evidence_ids=())


def _scope() -> AuthorizedScope:
    """Args: none. Returns: two synthetic authorized Course PDFs. Raises: None."""
    slide, support = uuid4(), uuid4()
    return AuthorizedScope(
        actor_id=uuid4(),
        documents=tuple(
            AuthorizedDocument(
                document_id=document_id,
                document_version=1,
                source_type=SourceType.COURSE_MATERIAL_PDF,
                allowed_pages=(1, 2),
            )
            for document_id in (slide, support)
        ),
        current_document_id=slide,
        current_page_number=1,
    )


def _chunk(document_id: UUID, page: int, evidence_id: str) -> RetrievedEvidence:
    """Args: synthetic PDF/page/ID. Returns: one typed chunk. Raises: validation errors."""
    return RetrievedEvidence(
        evidence_id=evidence_id,
        document_id=document_id,
        document_version=1,
        source_type=SourceType.COURSE_MATERIAL_PDF,
        page_number=page,
        chunk_index=0,
        excerpt="Nội dung tổng hợp để kiểm tra truy xuất.",
        relevance_score=0.9,
    )


@pytest.mark.parametrize("required_id,expected_stages", [("current", 1), ("slide", 2), ("book", 3)])
def test_expands_only_after_previous_source_cannot_answer(
    required_id: str, expected_stages: int
) -> None:
    """Current page, other slide pages and support are consulted in that exact order."""
    scope = _scope()
    retrieval = RecordingRetrieval(
        (
            _chunk(scope.documents[0].document_id, 1, "current"),
            _chunk(scope.documents[0].document_id, 2, "slide"),
            _chunk(scope.documents[1].document_id, 2, "book"),
        )
    )
    provider = EvidenceOnlyAnswer(required_id)
    service = GroundedAnswerService(retrieval_service=retrieval, generation_client=provider)

    result = asyncio.run(service.answer(instruction="Giải thích cổng logic", scope=scope))

    assert result.status is AnswerStatus.ANSWERED
    assert len(retrieval.scopes) == expected_stages
    assert provider.calls == expected_stages
    assert retrieval.scopes[0].documents[0].allowed_pages == (1,)
    assert len(retrieval.scopes[0].documents) == 1
    if expected_stages >= 2:
        assert retrieval.scopes[1].documents == (scope.documents[0],)
    if expected_stages == 3:
        assert result.citations[0].document_id == scope.documents[1].document_id


def test_missing_evidence_exhausts_scopes_without_calling_provider() -> None:
    """Empty retrieval produces NO_EVIDENCE after all authorized stages."""
    retrieval = RecordingRetrieval(())
    provider = EvidenceOnlyAnswer("missing")
    service = GroundedAnswerService(retrieval_service=retrieval, generation_client=provider)

    result = asyncio.run(service.answer(instruction="Câu hỏi ngoài tài liệu", scope=_scope()))

    assert result.status is AnswerStatus.NO_EVIDENCE
    assert result.citations == ()
    assert len(retrieval.scopes) == 3
    assert provider.calls == 0


def test_provider_declines_all_authorized_evidence() -> None:
    """Keywords alone cannot turn an unsupported answer into ANSWERED."""
    scope = _scope()
    retrieval = RecordingRetrieval((_chunk(scope.documents[0].document_id, 1, "heading"),))
    provider = EvidenceOnlyAnswer("explicit-fact-not-present")
    service = GroundedAnswerService(retrieval_service=retrieval, generation_client=provider)

    result = asyncio.run(service.answer(instruction="Giải thích sâu hơn", scope=scope))

    assert result.status is AnswerStatus.NO_EVIDENCE
    assert provider.calls == 3


def test_stages_never_expand_java_page_authorization() -> None:
    """Every stage stays inside the original document version and page allow-list."""
    scope = _scope()
    original = {document.document_id: document for document in scope.documents}

    for stage in _answer_scopes(scope):
        for document in stage.documents:
            granted = original[document.document_id]
            assert document.document_version == granted.document_version
            assert document.allowed_pages is not None
            assert set(document.allowed_pages) <= set(granted.allowed_pages or ())


def test_personal_rag_keeps_its_single_scope() -> None:
    """Personal RAG does not inherit Course Tutor fallback semantics."""
    actor_id = uuid4()
    scope = AuthorizedScope(
        actor_id=actor_id,
        documents=(
            AuthorizedDocument(
                document_id=uuid4(),
                document_version=1,
                source_type=SourceType.PERSONAL_PDF,
                owner_id=actor_id,
            ),
        ),
    )

    assert _answer_scopes(scope) == (scope,)
