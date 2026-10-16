"""Grounded answer, summary, and quiz generation services."""

from app.clients.protocols import AnswerGenerationClient, QuizGenerationClient
from app.schemas.grounding import (
    AnswerStatus,
    AuthorizedScope,
    Citation,
    GroundedAnswerResult,
    QuizDraft,
    QuizGenerationArgs,
    QuizQuestionDraft,
    RetrievedEvidence,
)
from app.services.retrieval import RetrievalService


class InvalidGenerationOutput(RuntimeError):
    """Provider output violated grounding/count rules after schema validation."""


class GroundedAnswerService:
    """Answer or summarize only when authorized evidence is available."""

    def __init__(
        self,
        *,
        retrieval_service: RetrievalService,
        generation_client: AnswerGenerationClient,
    ) -> None:
        """Create a grounded answer service.

        Args:
            retrieval_service: Authorized evidence retrieval service.
            generation_client: Structured answer-generation provider.

        Returns:
            None.

        Raises:
            None.
        """

        self._retrieval_service = retrieval_service
        self._generation_client = generation_client

    async def answer(
        self,
        *,
        instruction: str,
        scope: AuthorizedScope,
        retrieval_limit: int = 8,
    ) -> GroundedAnswerResult:
        """Produce one answer or deterministic NO_EVIDENCE.

        Args:
            instruction: Student question or requested summary focus.
            scope: Documents and pages authorized by Java.
            retrieval_limit: Maximum number of chunks used as evidence.

        Returns:
            ANSWERED with validated citations, or NO_EVIDENCE without text.

        Raises:
            ValueError: If input is invalid.
            InvalidGenerationOutput: If provider cites unknown evidence.
            RuntimeError: If embedding, retrieval, or generation fails.
        """

        evidence = await self._retrieval_service.retrieve(
            query=instruction,
            scope=scope,
            limit=retrieval_limit,
        )
        if not evidence:
            return GroundedAnswerResult(status=AnswerStatus.NO_EVIDENCE)

        generated = await self._generation_client.generate_answer(
            instruction=instruction.strip(),
            evidence=evidence,
        )
        if generated.answer is None:
            return GroundedAnswerResult(status=AnswerStatus.NO_EVIDENCE)
        citations = _citations_from_ids(generated.cited_evidence_ids, evidence)
        return GroundedAnswerResult(
            status=AnswerStatus.ANSWERED,
            answer=generated.answer.strip(),
            citations=citations,
        )

    async def summarize(self, *, instruction: str, scope: AuthorizedScope) -> GroundedAnswerResult:
        """Summarize every chunk in the bounded scope, preserving source citations.

        Args: instruction: user focus; scope: selected authorized PDF pages.
        Returns: Grounded summary or NO_EVIDENCE.
        Raises: ValueError for oversized scope; InvalidGenerationOutput for invalid
            citations; provider/database errors.
        """
        if not instruction.strip():
            raise ValueError("summary instruction must not be blank")
        evidence = self._retrieval_service.collect_for_summary(scope=scope)
        if not evidence:
            return GroundedAnswerResult(status=AnswerStatus.NO_EVIDENCE)
        generated = await self._generation_client.generate_answer(
            instruction="Summarize the supplied authorized pages. User request: " + instruction,
            evidence=evidence,
        )
        if generated.answer is None:
            return GroundedAnswerResult(status=AnswerStatus.NO_EVIDENCE)
        return GroundedAnswerResult(
            status=AnswerStatus.ANSWERED,
            answer=generated.answer,
            citations=_citations_from_ids(generated.cited_evidence_ids, evidence),
        )


class GroundedQuizService:
    """Generate validated MCQ_SINGLE drafts without changing Quiz lifecycle."""

    def __init__(
        self,
        *,
        retrieval_service: RetrievalService,
        generation_client: QuizGenerationClient,
    ) -> None:
        """Create a grounded quiz-generation service.

        Args:
            retrieval_service: Authorized evidence retrieval service.
            generation_client: Structured quiz-generation provider.

        Returns:
            None.

        Raises:
            None.
        """

        self._retrieval_service = retrieval_service
        self._generation_client = generation_client

    async def generate(
        self,
        *,
        instruction: str,
        args: QuizGenerationArgs,
        scope: AuthorizedScope,
        retrieval_limit: int = 20,
    ) -> QuizDraft | None:
        """Generate a grounded Quiz draft or return None when evidence is absent.

        Args:
            instruction: User prompt used only as retrieval and generation context.
            args: Trusted question count, difficulty, and optional topic from Java.
            scope: Documents and pages authorized by Java.
            retrieval_limit: Maximum evidence chunks, between 1 and 50.

        Returns:
            Validated MCQ_SINGLE Quiz draft, or None for NO_EVIDENCE.

        Raises:
            ValueError: If prompt or retrieval limits are invalid.
            InvalidGenerationOutput: If count, uniqueness, or citation checks fail.
            RuntimeError: If embedding, retrieval, or generation fails.
        """

        normalized_instruction = instruction.strip()
        if not normalized_instruction:
            raise ValueError("instruction must not be blank")
        retrieval_query = " ".join(
            part for part in (normalized_instruction, args.topic) if part is not None
        )
        evidence = await self._retrieval_service.retrieve(
            query=retrieval_query,
            scope=scope,
            limit=retrieval_limit,
        )
        if not evidence:
            return None

        generated = await self._generation_client.generate_quiz(
            args=args,
            evidence=evidence,
        )
        if not generated.questions:
            return None
        if len(generated.questions) != args.question_count:
            raise InvalidGenerationOutput("provider returned an unexpected question count")
        normalized_questions = {
            question.question.strip().casefold() for question in generated.questions
        }
        if len(normalized_questions) != len(generated.questions):
            raise InvalidGenerationOutput("provider returned duplicate questions")

        questions = tuple(
            QuizQuestionDraft(
                question=question.question.strip(),
                options=question.options,
                correct_option_index=question.correct_option_index,
                explanation=question.explanation.strip(),
                citations=_citations_from_ids(question.cited_evidence_ids, evidence),
            )
            for question in generated.questions
        )
        return QuizDraft(title=generated.title.strip(), questions=questions)


def _citations_from_ids(
    cited_evidence_ids: tuple[str, ...],
    evidence: tuple[RetrievedEvidence, ...],
) -> tuple[Citation, ...]:
    """Map provider-selected evidence identifiers to trusted citations.

    Args:
        cited_evidence_ids: Evidence identifiers selected by the provider.
        evidence: Authorized chunks supplied to that provider call.

    Returns:
        Deduplicated citations assembled from trusted evidence fields.

    Raises:
        InvalidGenerationOutput: If a citation is missing or outside supplied evidence.
    """

    evidence_by_id = {item.evidence_id: item for item in evidence}
    citations: list[Citation] = []
    seen: set[tuple[object, ...]] = set()
    for evidence_id in cited_evidence_ids:
        item = evidence_by_id.get(evidence_id)
        if item is None:
            raise InvalidGenerationOutput("provider cited evidence outside the retrieved scope")
        key = (
            item.document_id,
            item.document_version,
            item.page_number,
            item.excerpt,
        )
        if key in seen:
            continue
        seen.add(key)
        citations.append(
            Citation(
                document_id=item.document_id,
                document_version=item.document_version,
                page_number=item.page_number,
                excerpt=item.excerpt[:1200],
            )
        )
    if not citations:
        raise InvalidGenerationOutput("provider output must cite at least one evidence chunk")
    return tuple(citations)
