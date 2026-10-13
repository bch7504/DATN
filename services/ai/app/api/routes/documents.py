"""Authenticated asynchronous document index/deindex endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.dependencies import get_database_session
from app.core.security import RequestContext, require_internal_request
from app.repositories.job_repository import JobRepository
from app.schemas.jobs import DeindexRequest, IndexRequest, JobAcceptedResponse, JobResponse

router = APIRouter(tags=["documents"])
InternalContext = Annotated[RequestContext, Depends(require_internal_request)]
JobKey = Annotated[str, Header(alias="Idempotency-Key", min_length=8, max_length=255)]


def get_job_repository(session: Annotated[Session, Depends(get_database_session)]) -> JobRepository:
    """Create job store. Args: session. Returns: repository. Raises: none."""
    return JobRepository(session)


@router.post("/documents/index", status_code=202, response_model=JobAcceptedResponse)
def index_document(
    payload: IndexRequest,
    context: InternalContext,
    idempotency_key: JobKey,
    repository: Annotated[JobRepository, Depends(get_job_repository)],
) -> JobAcceptedResponse:
    """Queue a PDF index operation.

    Args: payload: immutable PDF version; context: Java request; idempotency_key: operation key;
        repository: durable job store.
    Returns: 202 acceptance envelope after commit.
    Raises: ServiceError for authentication/key conflict; validation errors; database errors.
    """
    job = repository.enqueue(
        payload=payload, request_id=context.request_id, idempotency_key=idempotency_key
    )
    return JobAcceptedResponse(request_id=context.request_id, job_id=job.job_id, status=job.status)


@router.post("/documents/deindex", status_code=202, response_model=JobAcceptedResponse)
def deindex_document(
    payload: DeindexRequest,
    context: InternalContext,
    idempotency_key: JobKey,
    repository: Annotated[JobRepository, Depends(get_job_repository)],
) -> JobAcceptedResponse:
    """Queue deletion and immediately disable the selected index.

    Args: payload: document/version/pipeline; context: Java request; idempotency_key: stable key;
        repository: durable job store.
    Returns: 202 acceptance envelope.
    Raises: ServiceError for authentication/key conflict; validation/database errors.
    """
    job = repository.enqueue(
        payload=payload, request_id=context.request_id, idempotency_key=idempotency_key
    )
    return JobAcceptedResponse(request_id=context.request_id, job_id=job.job_id, status=job.status)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(
    job_id: UUID,
    context: InternalContext,
    repository: Annotated[JobRepository, Depends(get_job_repository)],
) -> JobResponse:
    """Poll without exposing URLs.

    Args: job_id: queued job; context: authenticated caller; repository: AI metadata store.
    Returns: Status, attempt count, safe error code, and artifact metadata.
    Raises: ServiceError for missing job; authentication/validation/database errors.
    """
    return repository.get(job_id=job_id, request_id=context.request_id)
