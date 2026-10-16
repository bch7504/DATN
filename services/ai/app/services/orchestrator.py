"""Single-agent orchestration for Personal Document operations."""

import json

from app.clients.protocols import IntentClassificationClient
from app.repositories.models import SourceType
from app.schemas.grounding import AnswerStatus, AuthorizedScope
from app.schemas.orchestration import (
    AssistantRunResult,
    AssistantRunStatus,
    AssistantTool,
    ConversationTurn,
)
from app.services.grounded_generation import GroundedAnswerService, GroundedQuizService


class PersonalAssistantOrchestrator:
    """Allow one classifier to select among three explicitly registered tools."""

    def __init__(
        self,
        *,
        intent_client: IntentClassificationClient,
        answer_service: GroundedAnswerService,
        quiz_service: GroundedQuizService,
        minimum_confidence: float = 0.65,
    ) -> None:
        """Create a constrained single-agent orchestrator.

        Args:
            intent_client: Structured intent classifier.
            answer_service: Tool for questions and summaries.
            quiz_service: Tool for grounded quiz drafts.
            minimum_confidence: Minimum classifier confidence for execution.

        Returns:
            None.

        Raises:
            ValueError: If minimum_confidence is outside 0..1.
        """

        if not 0.0 <= minimum_confidence <= 1.0:
            raise ValueError("minimum_confidence must be between zero and one")
        self._intent_client = intent_client
        self._answer_service = answer_service
        self._quiz_service = quiz_service
        self._minimum_confidence = minimum_confidence

    async def run(
        self,
        *,
        message: str,
        scope: AuthorizedScope,
        history: tuple[ConversationTurn, ...] = (),
    ) -> AssistantRunResult:
        """Classify and execute exactly one allowed Personal Document tool.

        Args:
            message: Untrusted free-form Student message.
            scope: Personal PDF versions authorized by Java for the Student.
            history: At most twelve sanitized prior turns supplied by Java.

        Returns:
            Structured answer, summary, quiz, clarification, or NO_EVIDENCE.

        Raises:
            ValueError: If message is blank or scope contains non-personal data.
            RuntimeError: If a provider or retrieval dependency fails.
        """

        normalized_message = message.strip()
        if not normalized_message:
            raise ValueError("message must not be blank")
        if len(history) > 12:
            raise ValueError("history must contain at most twelve turns")
        if any(
            document.source_type is not SourceType.PERSONAL_PDF
            or document.owner_id != scope.actor_id
            for document in scope.documents
        ):
            raise ValueError("Personal Assistant scope must contain actor-owned Personal PDFs")

        contextual_message = _contextual_message(normalized_message, history)
        decision = await self._intent_client.classify_intent(message=contextual_message)
        if decision.confidence < self._minimum_confidence:
            return AssistantRunResult(
                selected_tool=AssistantTool.NEEDS_CLARIFICATION,
                status=AssistantRunStatus.NEEDS_CLARIFICATION,
                clarification_question="Bạn muốn hỏi đáp, tóm tắt hay tạo câu hỏi ôn tập?",
            )
        if decision.selected_tool is AssistantTool.NEEDS_CLARIFICATION:
            return AssistantRunResult(
                selected_tool=decision.selected_tool,
                status=AssistantRunStatus.NEEDS_CLARIFICATION,
                clarification_question=decision.clarification_question,
            )
        if decision.selected_tool is AssistantTool.GENERATE_QUIZ:
            if decision.quiz_args is None:
                return AssistantRunResult(
                    selected_tool=AssistantTool.NEEDS_CLARIFICATION,
                    status=AssistantRunStatus.NEEDS_CLARIFICATION,
                    clarification_question="Bạn muốn tạo bao nhiêu câu hỏi và mức độ khó nào?",
                )
            quiz = await self._quiz_service.generate(
                instruction=contextual_message,
                args=decision.quiz_args,
                scope=scope,
            )
            if quiz is None:
                return AssistantRunResult(
                    selected_tool=decision.selected_tool,
                    status=AssistantRunStatus.NO_EVIDENCE,
                )
            return AssistantRunResult(
                selected_tool=decision.selected_tool,
                status=AssistantRunStatus.QUIZ_CREATED,
                quiz=quiz,
            )

        operation = (
            self._answer_service.summarize
            if decision.selected_tool is AssistantTool.SUMMARIZE_DOCUMENT
            else self._answer_service.answer
        )
        answer_result = await operation(
            instruction=contextual_message,
            scope=scope,
        )
        if answer_result.status is AnswerStatus.NO_EVIDENCE:
            return AssistantRunResult(
                selected_tool=decision.selected_tool,
                status=AssistantRunStatus.NO_EVIDENCE,
            )
        status = (
            AssistantRunStatus.SUMMARIZED
            if decision.selected_tool is AssistantTool.SUMMARIZE_DOCUMENT
            else AssistantRunStatus.ANSWERED
        )
        return AssistantRunResult(
            selected_tool=decision.selected_tool,
            status=status,
            answer=answer_result.answer,
            citations=answer_result.citations,
        )


def _contextual_message(message: str, history: tuple[ConversationTurn, ...]) -> str:
    """Serialize a bounded conversation window without changing its roles.

    Args:
        message: Current non-blank user message.
        history: Sanitized prior turns supplied by Java.

    Returns:
        JSON containing prior turns and current message for the model.

    Raises:
        TypeError: If values cannot be serialized.
    """

    return json.dumps(
        {
            "history": [{"role": turn.role.value, "content": turn.content} for turn in history],
            "current_message": message,
        },
        ensure_ascii=False,
    )
