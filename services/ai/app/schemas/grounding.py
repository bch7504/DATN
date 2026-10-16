"""Typed authorization, evidence, citation, answer, and quiz contracts."""

from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from app.repositories.models import SourceType


class GroundingModel(BaseModel):
    """Base model with immutable fields and camelCase wire aliases."""

    model_config = ConfigDict(
        frozen=True,
        extra="forbid",
        str_strip_whitespace=True,
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class AuthorizedDocument(GroundingModel):
    """One immutable PDF version Java has authorized for an AI operation."""

    document_id: UUID
    document_version: int = Field(ge=1)
    owner_id: UUID | None = None
    source_type: SourceType
    allowed_pages: tuple[int, ...] | None = None

    @model_validator(mode="after")
    def require_personal_owner(self) -> "AuthorizedDocument":
        """Validate owner. Args: validated self. Returns: self. Raises: ValueError if absent."""
        if self.source_type is SourceType.PERSONAL_PDF and self.owner_id is None:
            raise ValueError("Personal PDF scope requires an owner")
        return self

    @field_validator("allowed_pages")
    @classmethod
    def validate_allowed_pages(cls, value: tuple[int, ...] | None) -> tuple[int, ...] | None:
        """Validate and normalize an optional page allow-list.

        Args:
            value: Optional tuple of 1-based page numbers granted by Java.

        Returns:
            A sorted tuple without duplicate page numbers, or None.

        Raises:
            ValueError: If any page number is less than one.
        """

        if value is None:
            return None
        if any(page_number < 1 for page_number in value):
            raise ValueError("allowed_pages must contain only positive page numbers")
        return tuple(sorted(set(value)))


class AuthorizedScope(GroundingModel):
    """Minimal document scope Java grants to one authenticated actor."""

    actor_id: UUID
    documents: tuple[AuthorizedDocument, ...] = Field(min_length=1, max_length=20)
    current_document_id: UUID | None = None
    current_page_number: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_current_page_context(self) -> "AuthorizedScope":
        """Ensure current-page context refers to an authorized document.

        Args:
            None. Pydantic supplies the validated model instance.

        Returns:
            This validated scope.

        Raises:
            ValueError: If only half of the current-page context is supplied,
                the document is outside the scope, or the page is disallowed.
        """

        if (self.current_document_id is None) != (self.current_page_number is None):
            raise ValueError("current document and current page must be supplied together")
        identifiers = [document.document_id for document in self.documents]
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("authorize each document only once per request")
        if any(
            document.source_type is SourceType.PERSONAL_PDF and document.owner_id != self.actor_id
            for document in self.documents
        ):
            raise ValueError("Personal PDF owner must match the actor")
        if self.current_document_id is None:
            return self

        matching = [
            document
            for document in self.documents
            if document.document_id == self.current_document_id
        ]
        if not matching:
            raise ValueError("current document is outside the authorized scope")
        allowed_pages = matching[0].allowed_pages
        if allowed_pages is not None and self.current_page_number not in allowed_pages:
            raise ValueError("current page is outside the authorized scope")
        return self


class RetrievedEvidence(GroundingModel):
    """One retrieved chunk that remains traceable to an authorized PDF page."""

    evidence_id: str = Field(min_length=1, max_length=128)
    document_id: UUID
    document_version: int = Field(ge=1)
    owner_id: UUID | None = None
    source_type: SourceType
    page_number: int = Field(ge=1)
    chunk_index: int = Field(ge=0)
    excerpt: str = Field(min_length=1)
    relevance_score: float = Field(ge=0.0, le=1.0)


class Citation(GroundingModel):
    """Public citation assembled only from retrieved evidence."""

    document_id: UUID
    document_version: int = Field(ge=1)
    page_number: int = Field(ge=1)
    excerpt: str = Field(min_length=1, max_length=1200)


class AnswerStatus(StrEnum):
    """Possible grounded-answer outcomes."""

    ANSWERED = "ANSWERED"
    NO_EVIDENCE = "NO_EVIDENCE"


class GeneratedAnswer(GroundingModel):
    """Provider output before service-owned citation validation."""

    answer: str | None = Field(default=None, min_length=1)
    cited_evidence_ids: tuple[str, ...] = ()

    @model_validator(mode="after")
    def validate_answer_evidence(self) -> "GeneratedAnswer":
        """Validate abstention. Args: self. Returns: self. Raises: ValueError on mismatch."""
        if (self.answer is not None) != bool(self.cited_evidence_ids):
            raise ValueError("answer and cited evidence must both be present or both absent")
        return self


class GroundedAnswerResult(GroundingModel):
    """Structured result returned to Java for an answer or summary."""

    status: AnswerStatus
    answer: str | None = None
    citations: tuple[Citation, ...] = ()

    @model_validator(mode="after")
    def validate_status_payload(self) -> "GroundedAnswerResult":
        """Enforce mutually consistent answer and no-evidence payloads.

        Args:
            None. Pydantic supplies the validated model instance.

        Returns:
            This validated result.

        Raises:
            ValueError: If status, answer, and citations are inconsistent.
        """

        if self.status is AnswerStatus.NO_EVIDENCE:
            if self.answer is not None or self.citations:
                raise ValueError("NO_EVIDENCE must not contain answer text or citations")
            return self
        if self.answer is None or not self.answer.strip() or not self.citations:
            raise ValueError("ANSWERED requires answer text and at least one citation")
        return self


class QuizDifficulty(StrEnum):
    """Difficulty values accepted by the quiz-generation boundary."""

    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    MIXED = "MIXED"


class QuizGenerationArgs(GroundingModel):
    """Structured quiz options that cannot be overridden by free-form prompts."""

    question_count: int = Field(ge=1, le=30)
    difficulty: QuizDifficulty
    topic: str | None = Field(default=None, max_length=300)

    @field_validator("topic")
    @classmethod
    def normalize_topic(cls, value: str | None) -> str | None:
        """Normalize an optional topic supplied by Java.

        Args:
            value: Optional topic used to focus question generation.

        Returns:
            Trimmed topic text or None.

        Raises:
            ValueError: If a non-null topic is blank.
        """

        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("topic must not be blank")
        return normalized


class GeneratedQuizQuestion(GroundingModel):
    """One provider-generated MCQ_SINGLE question before grounding validation."""

    question: str = Field(min_length=1)
    options: tuple[str, str, str, str]
    correct_option_index: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1)
    cited_evidence_ids: tuple[str, ...] = Field(min_length=1)

    @field_validator("options")
    @classmethod
    def validate_options(cls, value: tuple[str, str, str, str]) -> tuple[str, str, str, str]:
        """Require four non-blank and distinct answer choices.

        Args:
            value: Exactly four answer options.

        Returns:
            The normalized four-option tuple.

        Raises:
            ValueError: If an option is blank or duplicate.
        """

        normalized = tuple(option.strip() for option in value)
        if any(not option for option in normalized):
            raise ValueError("quiz options must not be blank")
        if len({option.casefold() for option in normalized}) != 4:
            raise ValueError("quiz options must be distinct")
        return normalized[0], normalized[1], normalized[2], normalized[3]


class GeneratedQuiz(GroundingModel):
    """Provider output for one quiz draft."""

    title: str = Field(min_length=1, max_length=200)
    questions: tuple[GeneratedQuizQuestion, ...] = Field(max_length=30)


class QuizQuestionDraft(GroundingModel):
    """One validated MCQ_SINGLE question with service-owned citations."""

    question: str = Field(min_length=1)
    options: tuple[str, str, str, str]
    correct_option_index: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1)
    citations: tuple[Citation, ...] = Field(min_length=1)


class QuizDraft(GroundingModel):
    """Grounded quiz draft returned to Java without lifecycle or score changes."""

    quiz_type: str = Field(default="MCQ_SINGLE", pattern="^MCQ_SINGLE$")
    title: str = Field(min_length=1, max_length=200)
    questions: tuple[QuizQuestionDraft, ...] = Field(min_length=1, max_length=30)
