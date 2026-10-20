"""Version-3 wire schemas for Java-to-Python AI requests."""

from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from app.repositories.models import SourceType
from app.schemas.grounding import (
    AuthorizedDocument,
    AuthorizedScope,
    GroundedAnswerResult,
    QuizDraft,
    QuizGenerationArgs,
)
from app.schemas.orchestration import AssistantRunResult, ConversationTurn


class WireModel(BaseModel):
    """Base model using camelCase on the internal HTTP boundary."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class AuthorizedDocumentRequest(WireModel):
    """One document/version/page scope authorized by Java."""

    document_id: UUID
    document_version: int = Field(ge=1)
    owner_id: UUID | None = None
    source_type: SourceType
    allowed_pages: tuple[int, ...] | None = None

    @model_validator(mode="after")
    def validate_document(self) -> "AuthorizedDocumentRequest":
        """Validate domain scope. Args: self. Returns: self. Raises: ValueError if invalid."""
        self.to_domain()
        return self

    def to_domain(self) -> AuthorizedDocument:
        """Convert a wire document scope to its immutable domain value.

        Args:
            None.

        Returns:
            Validated AuthorizedDocument.

        Raises:
            pydantic.ValidationError: If page scope is invalid.
        """

        return AuthorizedDocument(
            document_id=self.document_id,
            document_version=self.document_version,
            owner_id=self.owner_id,
            source_type=self.source_type,
            allowed_pages=self.allowed_pages,
        )


class PersonalAssistantRunRequest(WireModel):
    """Personal Assistant input containing only Java-authorized PDF scope."""

    user_id: UUID
    conversation_id: UUID | None = None
    documents: tuple[AuthorizedDocumentRequest, ...] = Field(min_length=1, max_length=20)
    history: tuple[ConversationTurn, ...] = Field(default=(), max_length=12)
    message: str = Field(min_length=1, max_length=4000)

    def to_scope(self) -> AuthorizedScope:
        """Build the domain scope for the authenticated user represented by Java.

        Args:
            None.

        Returns:
            Immutable authorized scope.

        Raises:
            pydantic.ValidationError: If any document scope is invalid.
        """

        return AuthorizedScope(
            actor_id=self.user_id,
            documents=tuple(document.to_domain() for document in self.documents),
        )


class CourseMaterialAskRequest(WireModel):
    """Student question scoped to one published Course Material PDF."""

    user_id: UUID
    course_offering_id: UUID
    document: AuthorizedDocumentRequest
    current_page_number: int = Field(ge=1)
    question: str = Field(min_length=1, max_length=4000)

    @model_validator(mode="after")
    def validate_course_document(self) -> "CourseMaterialAskRequest":
        """Reject Personal PDFs at the Course Material Tutor boundary.

        Args:
            None. Pydantic supplies the validated request.

        Returns:
            This validated request.

        Raises:
            ValueError: If source type or current page is outside scope.
        """

        if self.document.source_type is not SourceType.COURSE_MATERIAL_PDF:
            raise ValueError("Course Material Tutor requires COURSE_MATERIAL_PDF")
        if (
            self.document.allowed_pages is not None
            and self.current_page_number not in self.document.allowed_pages
        ):
            raise ValueError("current page must be inside allowed pages")
        return self

    def to_scope(self) -> AuthorizedScope:
        """Build a scope that prioritizes the current PDF page.

        Args:
            None.

        Returns:
            Authorized scope with current-page context.

        Raises:
            pydantic.ValidationError: If scope is inconsistent.
        """

        return AuthorizedScope(
            actor_id=self.user_id,
            documents=(self.document.to_domain(),),
            current_document_id=self.document.document_id,
            current_page_number=self.current_page_number,
        )


class QuizGenerationMode(StrEnum):
    """Two Java-authorized contexts that may request a Quiz draft."""

    PERSONAL_STUDENT = "PERSONAL_STUDENT"
    COURSE_TEACHER = "COURSE_TEACHER"


class QuizGenerationRequest(WireModel):
    """Direct Student or Teacher Quiz generation request."""

    actor_id: UUID
    mode: QuizGenerationMode
    documents: tuple[AuthorizedDocumentRequest, ...] = Field(min_length=1, max_length=20)
    instruction: str = Field(min_length=1, max_length=4000)
    generation_args: QuizGenerationArgs

    @model_validator(mode="after")
    def validate_mode_scope(self) -> "QuizGenerationRequest":
        """Match actor/mode to Personal or Course Material sources.

        Args:
            None. Pydantic supplies the validated request.

        Returns:
            This validated request.

        Raises:
            ValueError: If the requested mode and document scope disagree.
        """

        if self.mode is QuizGenerationMode.PERSONAL_STUDENT:
            if any(
                document.source_type is not SourceType.PERSONAL_PDF
                or document.owner_id != self.actor_id
                for document in self.documents
            ):
                raise ValueError("Personal Student Quiz requires actor-owned Personal PDFs")
        elif any(
            document.source_type is not SourceType.COURSE_MATERIAL_PDF
            for document in self.documents
        ):
            raise ValueError("Teacher Quiz requires Course Material PDFs")
        return self

    def to_scope(self) -> AuthorizedScope:
        """Build the immutable scope passed to retrieval.

        Args:
            None.

        Returns:
            Authorized document scope.

        Raises:
            pydantic.ValidationError: If document scope is invalid.
        """

        return AuthorizedScope(
            actor_id=self.actor_id,
            documents=tuple(document.to_domain() for document in self.documents),
        )


class PersonalAssistantRunResponse(WireModel):
    """Versioned Personal Assistant response returned to Java."""

    request_id: str
    result: AssistantRunResult


class CourseMaterialAskResponse(WireModel):
    """Versioned Tutor answer or NO_EVIDENCE response."""

    request_id: str
    result: GroundedAnswerResult


class QuizGenerationStatus(StrEnum):
    """Possible direct Quiz generation outcomes."""

    DRAFT_CREATED = "DRAFT_CREATED"
    NO_EVIDENCE = "NO_EVIDENCE"


class QuizGenerationResponse(WireModel):
    """Versioned grounded Quiz generation response."""

    request_id: str
    status: QuizGenerationStatus
    quiz: QuizDraft | None = None

    @model_validator(mode="after")
    def validate_quiz_payload(self) -> "QuizGenerationResponse":
        """Match response status to presence of a Quiz draft.

        Args:
            None. Pydantic supplies the validated response.

        Returns:
            This validated response.

        Raises:
            ValueError: If status and Quiz payload disagree.
        """

        if (self.status is QuizGenerationStatus.DRAFT_CREATED) != (self.quiz is not None):
            raise ValueError("DRAFT_CREATED requires quiz and NO_EVIDENCE forbids it")
        return self
