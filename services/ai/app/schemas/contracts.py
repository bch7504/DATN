"""Wire contracts for the Java-to-Python internal API."""

from typing import Literal

from pydantic import BaseModel, Field


PipelineType = Literal["PERSONAL_RAG", "TEACHER_SLIDE"]
JobStatus = Literal["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]
AnswerStatus = Literal["ANSWERED", "NO_EVIDENCE"]
QuizDifficulty = Literal["EASY", "MEDIUM", "HARD", "MIXED"]


class SourceLocation(BaseModel):
    kind: Literal["PAGE", "SLIDE", "SECTION"]
    value: str


class DocumentIndexRequest(BaseModel):
    document_id: str = Field(alias="documentId")
    document_version: int = Field(alias="documentVersion", ge=1)
    pipeline_type: PipelineType = Field(alias="pipelineType")
    owner_id: str | None = Field(default=None, alias="ownerId")
    signed_file_url: str = Field(alias="signedFileUrl")
    mime_type: str = Field(alias="mimeType")


class DocumentDeindexRequest(BaseModel):
    document_id: str = Field(alias="documentId")
    document_version: int = Field(alias="documentVersion", ge=1)
    pipeline_type: PipelineType = Field(alias="pipelineType")


class JobAccepted(BaseModel):
    request_id: str = Field(alias="requestId")
    job_id: str = Field(alias="jobId")
    status: Literal["QUEUED"]


class JobResult(BaseModel):
    request_id: str = Field(alias="requestId")
    job_id: str = Field(alias="jobId")
    document_id: str = Field(alias="documentId")
    document_version: int = Field(alias="documentVersion")
    pipeline_type: PipelineType = Field(alias="pipelineType")
    status: JobStatus
    attempts: int = Field(ge=0)
    error_code: str | None = Field(default=None, alias="errorCode")


class PersonalRagAskRequest(BaseModel):
    user_id: str = Field(alias="userId")
    authorized_document_ids: list[str] = Field(
        alias="authorizedDocumentIds", min_length=1
    )
    question: str = Field(min_length=1)
    conversation_id: str | None = Field(default=None, alias="conversationId")


class SlideTutorAskRequest(BaseModel):
    user_id: str = Field(alias="userId")
    document_id: str = Field(alias="documentId")
    current_slide: int = Field(alias="currentSlide", ge=1)
    allowed_slide_numbers: list[int] = Field(
        alias="allowedSlideNumbers", min_length=1
    )
    question: str = Field(min_length=1)


class Citation(BaseModel):
    document_id: str = Field(alias="documentId")
    location: SourceLocation
    excerpt: str


class AiAnswer(BaseModel):
    request_id: str = Field(alias="requestId")
    status: AnswerStatus
    answer: str | None = None
    citations: list[Citation] = Field(default_factory=list)


class QuizGenerateRequest(BaseModel):
    user_id: str = Field(alias="userId")
    authorized_document_ids: list[str] = Field(
        alias="authorizedDocumentIds", min_length=1
    )
    question_count: int = Field(default=10, alias="questionCount", ge=1, le=50)
    difficulty: QuizDifficulty = "MIXED"


class QuizOption(BaseModel):
    text: str = Field(min_length=1)


class QuizQuestionDraft(BaseModel):
    prompt: str = Field(min_length=1)
    options: list[QuizOption] = Field(min_length=2)
    correct_option_index: int = Field(alias="correctOptionIndex", ge=0)
    explanation: str = Field(min_length=1)
    sources: list[Citation] = Field(min_length=1)


class QuizGenerateResponse(BaseModel):
    request_id: str = Field(alias="requestId")
    questions: list[QuizQuestionDraft] = Field(min_length=1)
