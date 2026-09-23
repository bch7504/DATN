"""Application service for internal document job contracts."""

from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies import RequestContext, require_idempotency
from app.core.errors import ServiceError
from app.db import get_session
from app.repositories.jobs import JobRepository
from app.schemas.contracts import (
    DocumentDeindexRequest,
    DocumentIndexRequest,
    JobAccepted,
    JobResult,
)


class JobService:
    """Validate application-level job behavior around the SQL repository."""

    def __init__(self, repository: JobRepository) -> None:
        """Create the job service.

        Args:
            repository: Python-owned durable job repository.
        Returns:
            None. Stores the dependency.
        Raises:
            None.
        """
        self._repository = repository

    def enqueue_index(self, request: DocumentIndexRequest, context: RequestContext) -> JobAccepted:
        """Accept an authorized index request idempotently.

        Args:
            request: Schema-v2 PDF/PPTX metadata and signed file URL from Java.
            context: Authenticated request ID/schema/idempotency headers.
        Returns:
            JobAccepted: Existing or new durable job identity and current status.
        Raises:
            ServiceError: Missing/conflicting idempotency or unavailable persistence.
        """
        key = require_idempotency(context)
        try:
            job = self._repository.enqueue(
                request_id=context.request_id,
                idempotency_key=key,
                operation="INDEX",
                document_id=request.document_id,
                document_version=request.document_version,
                pipeline_type=request.pipeline_type,
                owner_id=request.owner_id,
                signed_file_url=request.signed_file_url,
                mime_type=request.mime_type,
            )
        except SQLAlchemyError as error:
            raise ServiceError("JOB_STORE_UNAVAILABLE", "Job persistence is unavailable", 503) from error
        return JobAccepted(requestId=job.request_id, jobId=job.id, status=job.status)

    def enqueue_deindex(self, request: DocumentDeindexRequest, context: RequestContext) -> JobAccepted:
        """Accept an authorized deindex request idempotently.

        Args:
            request: Exact Java document/version/pipeline to remove.
            context: Authenticated request ID/schema/idempotency headers.
        Returns:
            JobAccepted: Existing or new durable job identity and current status.
        Raises:
            ServiceError: Missing/conflicting idempotency or unavailable persistence.
        """
        key = require_idempotency(context)
        try:
            job = self._repository.enqueue(
                request_id=context.request_id,
                idempotency_key=key,
                operation="DEINDEX",
                document_id=request.document_id,
                document_version=request.document_version,
                pipeline_type=request.pipeline_type,
            )
        except SQLAlchemyError as error:
            raise ServiceError("JOB_STORE_UNAVAILABLE", "Job persistence is unavailable", 503) from error
        return JobAccepted(requestId=job.request_id, jobId=job.id, status=job.status)

    def get_job(self, job_id: str) -> JobResult:
        """Return safe job status without signed URL or document content.

        Args:
            job_id: Job UUID previously returned to Java.
        Returns:
            JobResult: Stable schema-v2 status fields.
        Raises:
            ServiceError: Job absent or persistence unavailable.
        """
        try:
            job = self._repository.get(job_id)
        except SQLAlchemyError as error:
            raise ServiceError("JOB_STORE_UNAVAILABLE", "Job persistence is unavailable", 503) from error
        if job is None:
            raise ServiceError("JOB_NOT_FOUND", "Background job was not found", 404)
        return JobResult(
            requestId=job.request_id,
            jobId=job.id,
            documentId=job.document_id,
            documentVersion=job.document_version,
            pipelineType=job.pipeline_type,
            status=job.status,
            attempts=job.attempts,
            errorCode=job.error_code,
        )


def get_job_service(session: Session = Depends(get_session)) -> JobService:
    """Build the request-scoped job application service.

    Args:
        session: SQLAlchemy session injected by FastAPI.
    Returns:
        JobService: Service backed by the Python-owned repository.
    Raises:
        None. Database operations occur only in service methods.
    """
    return JobService(JobRepository(session))
