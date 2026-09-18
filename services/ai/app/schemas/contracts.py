"""Contracts shared conceptually with the Java integration client."""

from typing import Literal

from pydantic import BaseModel, Field


class SourceLocation(BaseModel):
    kind: Literal["PAGE", "SLIDE", "SECTION"]
    value: str


class DocumentIndexRequest(BaseModel):
    request_id: str = Field(alias="requestId")
    document_id: str = Field(alias="documentId")
    owner_id: str = Field(alias="ownerId")
    source_type: Literal["OFFICIAL", "PERSONAL"] = Field(alias="sourceType")
    signed_file_url: str = Field(alias="signedFileUrl")
    mime_type: str = Field(alias="mimeType")


class RagAskRequest(BaseModel):
    request_id: str = Field(alias="requestId")
    user_id: str = Field(alias="userId")
    subject_id: str = Field(alias="subjectId")
    question: str
    document_id: str | None = Field(default=None, alias="documentId")
    topic_id: str | None = Field(default=None, alias="topicId")
    location: SourceLocation | None = None


class Citation(BaseModel):
    document_id: str = Field(alias="documentId")
    document_name: str = Field(alias="documentName")
    location: SourceLocation
    excerpt: str


class RagAnswer(BaseModel):
    request_id: str = Field(alias="requestId")
    answer: str
    citations: list[Citation]


class QuizGenerateRequest(BaseModel):
    request_id: str = Field(alias="requestId")
    subject_id: str = Field(alias="subjectId")
    topic_id: str = Field(alias="topicId")
    document_id: str | None = Field(default=None, alias="documentId")
    question_count: int = Field(alias="questionCount", ge=1, le=50)
    difficulty: Literal["EASY", "MEDIUM", "HARD"]


class GeneratedQuestion(BaseModel):
    prompt: str
    options: list[str] = Field(min_length=2)
    correct_option_index: int = Field(alias="correctOptionIndex", ge=0)
    explanation: str
    topic_id: str = Field(alias="topicId")
    difficulty: Literal["EASY", "MEDIUM", "HARD"]


class QuizGenerateResponse(BaseModel):
    request_id: str = Field(alias="requestId")
    questions: list[GeneratedQuestion]

