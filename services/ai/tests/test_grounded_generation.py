"""Contract tests for authorized retrieval and grounded generation."""

from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.repositories.models import SourceType
from app.schemas.grounding import (
    AnswerStatus,
    AuthorizedDocument,
    AuthorizedScope,
    GeneratedAnswer,
    GeneratedQuiz,
    GeneratedQuizQuestion,
    QuizDifficulty,
    QuizGenerationArgs,
    RetrievedEvidence,
)
from app.schemas.orchestration import (
    AssistantRunStatus,
    AssistantTool,
    IntentDecision,
)
from app.services.grounded_generation import GroundedAnswerService, GroundedQuizService
from app.services.orchestrator import PersonalAssistantOrchestrator
from app.services.retrieval import RetrievalService


class FakeEmbeddingClient:
    """Deterministic embedding fake that never calls an external provider."""

    def __init__(self, *, dimensions: int = 1024) -> None:
        """Create a fake with a fixed output dimension.

        Args:
            dimensions: Number of values in every returned vector.

        Returns:
            None.

        Raises:
            ValueError: If dimensions is not positive.
        """

        if dimensions < 1:
            raise ValueError("dimensions must be positive")
        self._dimensions = dimensions

    async def embed(self, texts: tuple[str, ...]) -> tuple[tuple[float, ...], ...]:
        """Return one deterministic vector for each non-blank text.

        Args:
            texts: Synthetic text values supplied by the service.

        Returns:
            Fixed vectors matching the configured dimensions.

        Raises:
            ValueError: If input is empty or contains blank text.
        """

        if not texts or any(not text.strip() for text in texts):
            raise ValueError("texts must not be empty or blank")
        vector = tuple(0.1 for _ in range(self._dimensions))
        return tuple(vector for _ in texts)


class FakeChunkRepository:
    """Repository fake that can intentionally return out-of-scope chunks."""

    def __init__(self, evidence: tuple[RetrievedEvidence, ...]) -> None:
        """Store deterministic evidence for later searches.

        Args:
            evidence: Synthetic chunks returned by every search.

        Returns:
            None.

        Raises:
            None.
        """

        self._evidence = evidence

    def search(
        self,
        *,
        query_text: str,
        query_embedding: tuple[float, ...],
        scope: AuthorizedScope,
        limit: int,
    ) -> tuple[RetrievedEvidence, ...]:
        """Return configured evidence while respecting only the result limit.

        Args:
            query_embedding: Synthetic query vector, accepted but not ranked.
            scope: Scope accepted but deliberately not filtered by this fake.
            limit: Maximum number of returned items.

        Returns:
            The first configured evidence items up to the requested limit.

        Raises:
            ValueError: If input vector or scope is unexpectedly empty.
        """

        if not query_text.strip() or not query_embedding or not scope.documents:
            raise ValueError("query text, embedding, and scope are required")
        return self._evidence[:limit]

    def collect(self, *, scope: AuthorizedScope, limit: int) -> tuple[RetrievedEvidence, ...]:
        """Return synthetic chunks. Args: scope, limit. Returns: evidence. Raises: none."""
        return self._evidence[:limit]


class FakeAnswerClient:
    """Configurable structured answer fake."""

    def __init__(self, result: GeneratedAnswer) -> None:
        """Create an answer fake.

        Args:
            result: Structured result returned when called.

        Returns:
            None.

        Raises:
            None.
        """

        self.result = result
        self.call_count = 0

    async def generate_answer(
        self,
        *,
        instruction: str,
        evidence: tuple[RetrievedEvidence, ...],
    ) -> GeneratedAnswer:
        """Return the configured answer and count the call.

        Args:
            instruction: Non-blank synthetic instruction.
            evidence: Non-empty synthetic evidence.

        Returns:
            Configured structured answer.

        Raises:
            ValueError: If required input is absent.
        """

        if not instruction.strip() or not evidence:
            raise ValueError("instruction and evidence are required")
        self.call_count += 1
        return self.result


class FakeQuizClient:
    """Configurable structured quiz fake."""

    def __init__(self, result: GeneratedQuiz) -> None:
        """Create a quiz fake.

        Args:
            result: Structured quiz returned when called.

        Returns:
            None.

        Raises:
            None.
        """

        self.result = result
        self.call_count = 0

    async def generate_quiz(
        self,
        *,
        args: QuizGenerationArgs,
        evidence: tuple[RetrievedEvidence, ...],
    ) -> GeneratedQuiz:
        """Return the configured quiz and count the call.

        Args:
            args: Validated synthetic quiz settings.
            evidence: Non-empty synthetic evidence.

        Returns:
            Configured structured quiz.

        Raises:
            ValueError: If evidence is absent.
        """

        if not evidence or args.question_count < 1:
            raise ValueError("quiz args and evidence are required")
        self.call_count += 1
        return self.result


class FakeIntentClient:
    """Deterministic structured intent-classification fake."""

    def __init__(self, decision: IntentDecision) -> None:
        """Create an intent fake.

        Args:
            decision: Structured decision returned for every message.

        Returns:
            None.

        Raises:
            None.
        """

        self._decision = decision

    async def classify_intent(self, *, message: str) -> IntentDecision:
        """Return the configured decision for a non-blank message.

        Args:
            message: Synthetic untrusted message.

        Returns:
            Configured intent decision.

        Raises:
            ValueError: If message is blank.
        """

        if not message.strip():
            raise ValueError("message must not be blank")
        return self._decision


def _scope(
    *,
    document_id: UUID,
    owner_id: UUID,
    allowed_pages: tuple[int, ...] | None = None,
) -> AuthorizedScope:
    """Build one synthetic personal-document scope.

    Args:
        document_id: Synthetic document identifier.
        owner_id: Synthetic owner and actor identifier.
        allowed_pages: Optional page allow-list.

    Returns:
        Immutable authorized scope for tests.

    Raises:
        pydantic.ValidationError: If fixture input is invalid.
    """

    return AuthorizedScope(
        actor_id=owner_id,
        documents=(
            AuthorizedDocument(
                document_id=document_id,
                document_version=1,
                owner_id=owner_id,
                source_type=SourceType.PERSONAL_PDF,
                allowed_pages=allowed_pages,
            ),
        ),
    )


def _evidence(
    *,
    document_id: UUID,
    owner_id: UUID,
    evidence_id: str = "chunk:1",
    page_number: int = 2,
    relevance_score: float = 0.9,
) -> RetrievedEvidence:
    """Build one synthetic evidence chunk.

    Args:
        document_id: Synthetic source document identifier.
        owner_id: Synthetic personal-document owner.
        evidence_id: Stable fake identifier exposed to the provider.
        page_number: One-based source page.
        relevance_score: Normalized retrieval score.

    Returns:
        Immutable evidence fixture.

    Raises:
        pydantic.ValidationError: If fixture input is invalid.
    """

    return RetrievedEvidence(
        evidence_id=evidence_id,
        document_id=document_id,
        document_version=1,
        owner_id=owner_id,
        source_type=SourceType.PERSONAL_PDF,
        page_number=page_number,
        chunk_index=0,
        excerpt="ACID gồm tính nguyên tử, nhất quán, cô lập và bền vững.",
        relevance_score=relevance_score,
    )


def _retrieval_service(
    evidence: tuple[RetrievedEvidence, ...],
    *,
    minimum_relevance: float = 0.3,
) -> RetrievalService:
    """Build retrieval with deterministic test doubles.

    Args:
        evidence: Synthetic repository output.
        minimum_relevance: Relevance threshold applied after retrieval.

    Returns:
        Configured retrieval service.

    Raises:
        ValueError: If threshold is invalid.
    """

    return RetrievalService(
        embedding_client=FakeEmbeddingClient(),
        chunk_repository=FakeChunkRepository(evidence),
        minimum_relevance=minimum_relevance,
    )


def _unused_generated_quiz() -> GeneratedQuiz:
    """Build a valid synthetic quiz for branches that must not execute it.

    Args:
        None.

    Returns:
        One valid generated Quiz fixture.

    Raises:
        None.
    """

    return GeneratedQuiz(
        title="Không dùng",
        questions=(
            GeneratedQuizQuestion(
                question="Câu hỏi không dùng",
                options=("A", "B", "C", "D"),
                correct_option_index=0,
                explanation="Giải thích không dùng",
                cited_evidence_ids=("chunk:1",),
            ),
        ),
    )


@pytest.mark.anyio
async def test_answer_returns_no_evidence_without_calling_generator() -> None:
    """Confirm missing evidence prevents an LLM generation call."""

    owner_id = uuid4()
    document_id = uuid4()
    answer_client = FakeAnswerClient(
        GeneratedAnswer(answer="Không được gọi", cited_evidence_ids=("chunk:1",))
    )
    service = GroundedAnswerService(
        retrieval_service=_retrieval_service(()),
        generation_client=answer_client,
    )

    result = await service.answer(
        instruction="ACID là gì?",
        scope=_scope(document_id=document_id, owner_id=owner_id),
    )

    assert result.status is AnswerStatus.NO_EVIDENCE
    assert result.answer is None
    assert result.citations == ()
    assert answer_client.call_count == 0


@pytest.mark.anyio
async def test_retrieval_post_filter_blocks_wrong_owner_and_disallowed_page() -> None:
    """Confirm defense-in-depth removes repository leakage before generation."""

    owner_id = uuid4()
    document_id = uuid4()
    evidence = (
        _evidence(document_id=document_id, owner_id=uuid4(), evidence_id="wrong-owner"),
        _evidence(
            document_id=document_id,
            owner_id=owner_id,
            evidence_id="wrong-page",
            page_number=8,
        ),
        _evidence(
            document_id=document_id,
            owner_id=owner_id,
            evidence_id="allowed",
            page_number=2,
        ),
    )
    service = _retrieval_service(evidence)

    result = await service.retrieve(
        query="ACID",
        scope=_scope(document_id=document_id, owner_id=owner_id, allowed_pages=(2,)),
    )

    assert tuple(item.evidence_id for item in result) == ("allowed",)


@pytest.mark.anyio
async def test_answer_builds_citation_only_from_authorized_evidence() -> None:
    """Confirm provider text cannot invent citation metadata."""

    owner_id = uuid4()
    document_id = uuid4()
    evidence = _evidence(document_id=document_id, owner_id=owner_id)
    answer_client = FakeAnswerClient(
        GeneratedAnswer(
            answer="ACID có bốn thuộc tính chính.",
            cited_evidence_ids=(evidence.evidence_id,),
        )
    )
    service = GroundedAnswerService(
        retrieval_service=_retrieval_service((evidence,)),
        generation_client=answer_client,
    )

    result = await service.answer(
        instruction="ACID là gì?",
        scope=_scope(document_id=document_id, owner_id=owner_id),
    )

    assert result.status is AnswerStatus.ANSWERED
    assert result.citations[0].document_id == document_id
    assert result.citations[0].page_number == 2
    assert result.citations[0].excerpt == evidence.excerpt


@pytest.mark.anyio
async def test_answer_rejects_provider_citation_outside_evidence() -> None:
    """Confirm unknown provider evidence identifiers fail closed."""

    owner_id = uuid4()
    document_id = uuid4()
    evidence = _evidence(document_id=document_id, owner_id=owner_id)
    service = GroundedAnswerService(
        retrieval_service=_retrieval_service((evidence,)),
        generation_client=FakeAnswerClient(
            GeneratedAnswer(answer="Nội dung giả", cited_evidence_ids=("chunk:outside",))
        ),
    )

    with pytest.raises(RuntimeError, match="outside the retrieved scope"):
        await service.answer(
            instruction="Câu hỏi",
            scope=_scope(document_id=document_id, owner_id=owner_id),
        )


@pytest.mark.anyio
async def test_quiz_has_four_options_one_answer_and_grounded_citation() -> None:
    """Confirm a valid MCQ_SINGLE draft preserves the fixed schema."""

    owner_id = uuid4()
    document_id = uuid4()
    evidence = _evidence(document_id=document_id, owner_id=owner_id)
    generated_question = GeneratedQuizQuestion(
        question="Thuộc tính nào bảo đảm giao dịch là toàn bộ hoặc không gì cả?",
        options=("Atomicity", "Consistency", "Isolation", "Durability"),
        correct_option_index=0,
        explanation="Atomicity bảo đảm giao dịch được thực hiện toàn bộ hoặc hoàn tác.",
        cited_evidence_ids=(evidence.evidence_id,),
    )
    service = GroundedQuizService(
        retrieval_service=_retrieval_service((evidence,)),
        generation_client=FakeQuizClient(
            GeneratedQuiz(title="Ôn tập ACID", questions=(generated_question,))
        ),
    )

    result = await service.generate(
        instruction="Tạo câu hỏi về ACID",
        args=QuizGenerationArgs(question_count=1, difficulty=QuizDifficulty.MEDIUM),
        scope=_scope(document_id=document_id, owner_id=owner_id),
    )

    assert result is not None
    assert result.quiz_type == "MCQ_SINGLE"
    assert len(result.questions[0].options) == 4
    assert result.questions[0].correct_option_index == 0
    assert result.questions[0].citations[0].page_number == 2


def test_quiz_question_rejects_duplicate_options() -> None:
    """Confirm the structured provider schema rejects ambiguous choices."""

    with pytest.raises(ValidationError, match="must be distinct"):
        GeneratedQuizQuestion(
            question="Câu hỏi",
            options=("A", "A", "C", "D"),
            correct_option_index=0,
            explanation="Giải thích",
            cited_evidence_ids=("chunk:1",),
        )


@pytest.mark.anyio
async def test_model_abstention_survives_relevant_but_insufficient_chunks() -> None:
    """High similarity alone cannot force the provider to fabricate an answer or Quiz."""
    owner_id, document_id = uuid4(), uuid4()
    evidence = _evidence(document_id=document_id, owner_id=owner_id)
    retrieval = _retrieval_service((evidence,))
    scope = _scope(document_id=document_id, owner_id=owner_id)
    answer_service = GroundedAnswerService(
        retrieval_service=retrieval,
        generation_client=FakeAnswerClient(GeneratedAnswer(answer=None, cited_evidence_ids=())),
    )
    assert (
        await answer_service.answer(instruction="Unsupported claim?", scope=scope)
    ).status is AnswerStatus.NO_EVIDENCE
    quiz_service = GroundedQuizService(
        retrieval_service=retrieval,
        generation_client=FakeQuizClient(GeneratedQuiz(title="NO_EVIDENCE", questions=())),
    )
    assert (
        await quiz_service.generate(
            instruction="Unsupported topic",
            scope=scope,
            args=QuizGenerationArgs(question_count=10, difficulty=QuizDifficulty.HARD),
        )
        is None
    )


@pytest.mark.anyio
async def test_summary_refuses_silent_truncation() -> None:
    """Oversized scope must not be represented as a complete summary of only top chunks."""
    owner_id, document_id = uuid4(), uuid4()
    evidence = tuple(
        _evidence(
            document_id=document_id,
            owner_id=owner_id,
            evidence_id=f"chunk:{number}",
            page_number=number + 1,
        )
        for number in range(51)
    )
    client = FakeAnswerClient(
        GeneratedAnswer(answer="Must not execute", cited_evidence_ids=("chunk:0",))
    )
    service = GroundedAnswerService(
        retrieval_service=_retrieval_service(evidence), generation_client=client
    )
    with pytest.raises(ValueError, match="select fewer PDF pages"):
        await service.summarize(
            instruction="Summarize everything",
            scope=_scope(document_id=document_id, owner_id=owner_id),
        )
    assert client.call_count == 0


@pytest.mark.anyio
async def test_orchestrator_routes_summary_to_grounded_answer_tool() -> None:
    """Confirm one agent selects the summary tool without expanding scope."""

    owner_id = uuid4()
    document_id = uuid4()
    evidence = _evidence(document_id=document_id, owner_id=owner_id)
    retrieval_service = _retrieval_service((evidence,))
    orchestrator = PersonalAssistantOrchestrator(
        intent_client=FakeIntentClient(
            IntentDecision(
                selected_tool=AssistantTool.SUMMARIZE_DOCUMENT,
                confidence=0.95,
            )
        ),
        answer_service=GroundedAnswerService(
            retrieval_service=retrieval_service,
            generation_client=FakeAnswerClient(
                GeneratedAnswer(
                    answer="Tài liệu trình bày bốn thuộc tính ACID.",
                    cited_evidence_ids=(evidence.evidence_id,),
                )
            ),
        ),
        quiz_service=GroundedQuizService(
            retrieval_service=retrieval_service,
            generation_client=FakeQuizClient(_unused_generated_quiz()),
        ),
    )

    result = await orchestrator.run(
        message="Tóm tắt tài liệu này",
        scope=_scope(document_id=document_id, owner_id=owner_id),
    )

    assert result.selected_tool is AssistantTool.SUMMARIZE_DOCUMENT
    assert result.status is AssistantRunStatus.SUMMARIZED
    assert result.citations[0].document_id == document_id


@pytest.mark.anyio
async def test_orchestrator_low_confidence_requires_clarification() -> None:
    """Confirm uncertain intent never executes a document or Quiz tool."""

    owner_id = uuid4()
    document_id = uuid4()
    retrieval_service = _retrieval_service(())
    orchestrator = PersonalAssistantOrchestrator(
        intent_client=FakeIntentClient(
            IntentDecision(selected_tool=AssistantTool.ASK_DOCUMENT, confidence=0.2)
        ),
        answer_service=GroundedAnswerService(
            retrieval_service=retrieval_service,
            generation_client=FakeAnswerClient(
                GeneratedAnswer(answer="Không dùng", cited_evidence_ids=("chunk:1",))
            ),
        ),
        quiz_service=GroundedQuizService(
            retrieval_service=retrieval_service,
            generation_client=FakeQuizClient(_unused_generated_quiz()),
        ),
    )

    result = await orchestrator.run(
        message="Làm cái này giúp tôi",
        scope=_scope(document_id=document_id, owner_id=owner_id),
    )

    assert result.selected_tool is AssistantTool.NEEDS_CLARIFICATION
    assert result.status is AssistantRunStatus.NEEDS_CLARIFICATION
    assert result.clarification_question is not None


@pytest.mark.anyio
async def test_orchestrator_rejects_course_material_in_personal_scope() -> None:
    """Confirm the Personal Assistant cannot consume Teacher course material."""

    actor_id = uuid4()
    scope = AuthorizedScope(
        actor_id=actor_id,
        documents=(
            AuthorizedDocument(
                document_id=uuid4(),
                document_version=1,
                source_type=SourceType.COURSE_MATERIAL_PDF,
            ),
        ),
    )
    retrieval_service = _retrieval_service(())
    orchestrator = PersonalAssistantOrchestrator(
        intent_client=FakeIntentClient(
            IntentDecision(selected_tool=AssistantTool.ASK_DOCUMENT, confidence=0.9)
        ),
        answer_service=GroundedAnswerService(
            retrieval_service=retrieval_service,
            generation_client=FakeAnswerClient(
                GeneratedAnswer(answer="Không dùng", cited_evidence_ids=("chunk:1",))
            ),
        ),
        quiz_service=GroundedQuizService(
            retrieval_service=retrieval_service,
            generation_client=FakeQuizClient(_unused_generated_quiz()),
        ),
    )

    with pytest.raises(ValueError, match="actor-owned Personal PDFs"):
        await orchestrator.run(message="Hỏi nội dung", scope=scope)


@pytest.mark.anyio
@pytest.mark.parametrize("has_args", [True, False])
async def test_personal_quiz_tool_runs_only_with_complete_structured_args(has_args: bool) -> None:
    """Quiz intent either returns a grounded draft or requests the missing options."""
    owner_id, document_id = uuid4(), uuid4()
    retrieval = _retrieval_service((_evidence(document_id=document_id, owner_id=owner_id),))
    quiz_client = FakeQuizClient(_unused_generated_quiz())
    orchestrator = PersonalAssistantOrchestrator(
        intent_client=FakeIntentClient(
            IntentDecision(
                selected_tool=AssistantTool.GENERATE_QUIZ,
                confidence=0.99,
                quiz_args=QuizGenerationArgs(question_count=1, difficulty=QuizDifficulty.EASY)
                if has_args
                else None,
            )
        ),
        answer_service=GroundedAnswerService(
            retrieval_service=retrieval,
            generation_client=FakeAnswerClient(GeneratedAnswer(answer=None)),
        ),
        quiz_service=GroundedQuizService(
            retrieval_service=retrieval, generation_client=quiz_client
        ),
    )
    result = await orchestrator.run(
        message="Create a Quiz from my selected document",
        scope=_scope(document_id=document_id, owner_id=owner_id),
    )
    assert result.status is (
        AssistantRunStatus.QUIZ_CREATED if has_args else AssistantRunStatus.NEEDS_CLARIFICATION
    )
    assert quiz_client.call_count == (1 if has_args else 0)
    if has_args:
        assert result.quiz is not None
        assert result.quiz.questions[0].citations[0].document_id == document_id
