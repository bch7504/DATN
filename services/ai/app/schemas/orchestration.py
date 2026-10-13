"""Structured contracts for the Personal Document Single Orchestrator Agent."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from app.schemas.grounding import Citation, QuizDraft, QuizGenerationArgs


class OrchestrationModel(BaseModel):
    """Base model with immutable fields and camelCase wire aliases."""

    model_config = ConfigDict(
        frozen=True,
        extra="forbid",
        str_strip_whitespace=True,
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class AssistantTool(StrEnum):
    """Only tools the Personal Document Assistant may select."""

    ASK_DOCUMENT = "ASK_DOCUMENT"
    SUMMARIZE_DOCUMENT = "SUMMARIZE_DOCUMENT"
    GENERATE_QUIZ = "GENERATE_QUIZ"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"


class ConversationRole(StrEnum):
    """Allowed roles in the bounded conversation window supplied by Java."""

    USER = "USER"
    ASSISTANT = "ASSISTANT"


class ConversationTurn(OrchestrationModel):
    """One sanitized conversation turn used only for intent and context."""

    role: ConversationRole
    content: str = Field(min_length=1, max_length=4000)


class IntentDecision(OrchestrationModel):
    """Provider decision that remains subject to deterministic validation."""

    selected_tool: AssistantTool
    confidence: float = Field(ge=0.0, le=1.0)
    quiz_args: QuizGenerationArgs | None = None
    clarification_question: str | None = Field(default=None, min_length=1, max_length=300)

    @model_validator(mode="after")
    def validate_tool_arguments(self) -> "IntentDecision":
        """Require only the arguments appropriate for the selected tool.

        Args:
            None. Pydantic supplies the validated model instance.

        Returns:
            This validated decision.

        Raises:
            ValueError: If required arguments are missing or irrelevant fields
                are supplied for another tool.
        """

        if self.selected_tool is not AssistantTool.GENERATE_QUIZ and self.quiz_args is not None:
            raise ValueError("quiz_args is only valid for GENERATE_QUIZ")

        if self.selected_tool is AssistantTool.NEEDS_CLARIFICATION:
            if self.clarification_question is None:
                raise ValueError("NEEDS_CLARIFICATION requires a question")
        elif self.clarification_question is not None:
            raise ValueError("clarification question is only valid when clarification is needed")
        return self


class AssistantRunStatus(StrEnum):
    """User-visible outcomes of one Personal Assistant run."""

    ANSWERED = "ANSWERED"
    SUMMARIZED = "SUMMARIZED"
    QUIZ_CREATED = "QUIZ_CREATED"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
    NO_EVIDENCE = "NO_EVIDENCE"


class AssistantRunResult(OrchestrationModel):
    """Structured result returned to Java after one orchestrated operation."""

    selected_tool: AssistantTool
    status: AssistantRunStatus
    answer: str | None = None
    citations: tuple[Citation, ...] = ()
    quiz: QuizDraft | None = None
    clarification_question: str | None = None

    @model_validator(mode="after")
    def validate_result_payload(self) -> "AssistantRunResult":
        """Ensure each status exposes only its allowed payload.

        Args:
            None. Pydantic supplies the validated model instance.

        Returns:
            This validated result.

        Raises:
            ValueError: If result status and payload are inconsistent.
        """

        if self.status in {AssistantRunStatus.ANSWERED, AssistantRunStatus.SUMMARIZED}:
            if self.answer is None or not self.citations or self.quiz is not None:
                raise ValueError("answer outcomes require text and citations only")
            if self.clarification_question is not None:
                raise ValueError("answer outcomes cannot contain clarification")
            expected_tool = (
                AssistantTool.ASK_DOCUMENT
                if self.status is AssistantRunStatus.ANSWERED
                else AssistantTool.SUMMARIZE_DOCUMENT
            )
            if self.selected_tool is not expected_tool:
                raise ValueError("tool does not match answer status")
        elif self.status is AssistantRunStatus.QUIZ_CREATED:
            if self.quiz is None or self.answer is not None or self.citations:
                raise ValueError("QUIZ_CREATED requires only a quiz payload")
            if (
                self.selected_tool is not AssistantTool.GENERATE_QUIZ
                or self.clarification_question is not None
            ):
                raise ValueError("invalid Quiz tool payload")
        elif self.status is AssistantRunStatus.NEEDS_CLARIFICATION:
            if self.clarification_question is None:
                raise ValueError("NEEDS_CLARIFICATION requires a question")
            if (
                self.selected_tool is not AssistantTool.NEEDS_CLARIFICATION
                or self.answer is not None
                or self.citations
                or self.quiz is not None
            ):
                raise ValueError("clarification cannot contain generated output")
        elif any((self.answer, self.citations, self.quiz, self.clarification_question)):
            raise ValueError("NO_EVIDENCE must not contain generated content")
        return self
