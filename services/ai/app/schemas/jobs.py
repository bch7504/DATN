"""Version-3 document job HTTP and worker payloads."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import AnyHttpUrl, Field, model_validator

from app.repositories.models import JobOperation, JobStatus, SourceType
from app.schemas.api import WireModel
from app.schemas.indexing import IndexArtifact, IndexDocumentCommand


class IndexRequest(WireModel):
    """Index one PDF version. Signed URL never appears in job responses."""

    document_id: UUID
    document_version: int = Field(ge=1)
    pipeline_version: str = Field(min_length=1, max_length=64)
    owner_id: UUID | None = None
    source_type: SourceType
    signed_url: AnyHttpUrl = Field(repr=False)
    mime_type: Literal["application/pdf"]

    @model_validator(mode="after")
    def validate_index_input(self) -> "IndexRequest":
        """Validate scope. Args: self. Returns: self. Raises: ValueError on invalid source."""
        if self.source_type is SourceType.PERSONAL_PDF and self.owner_id is None:
            raise ValueError("Personal PDF requires an owner")
        if self.signed_url.scheme != "https":
            raise ValueError("signed URL must use HTTPS")
        return self


class DeindexRequest(WireModel):
    """Revoke one document/version/pipeline in the AI-owned schema."""

    document_id: UUID
    document_version: int = Field(ge=1)
    pipeline_version: str = Field(min_length=1, max_length=64)


class JobResponse(WireModel):
    """Safe asynchronous job state; never exposes storage URLs or source text."""

    request_id: str
    job_id: UUID
    status: JobStatus
    attempt: int = Field(ge=0)
    error_code: str | None = None
    artifact: IndexArtifact | None = None


class JobAcceptedResponse(WireModel):
    """Small 202 acceptance envelope."""

    request_id: str
    job_id: UUID
    status: JobStatus


class ClaimedJob(WireModel):
    """Immutable job snapshot reserved by one worker lease."""

    job_id: UUID
    claim_token: UUID
    operation: JobOperation
    document_id: UUID
    document_version: int
    pipeline_version: str
    lease_until: datetime
    command: IndexDocumentCommand | None = Field(default=None, repr=False)
