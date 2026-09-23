"""Route boundary for idempotent index/deindex jobs."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import RequestContext, require_internal_request
from app.schemas.contracts import DocumentDeindexRequest, DocumentIndexRequest, JobAccepted
from app.services.jobs import JobService, get_job_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/index", response_model=JobAccepted, status_code=status.HTTP_202_ACCEPTED)
def index_document(
    request: DocumentIndexRequest,
    context: Annotated[RequestContext, Depends(require_internal_request)],
    service: Annotated[JobService, Depends(get_job_service)],
) -> JobAccepted:
    """Persist an authorized schema-v2 index job.

    Args:
        request: Validated Personal PDF or Teacher PPTX metadata from Java.
        context: Authenticated internal headers including idempotency key.
        service: Request-scoped durable job application service.
    Returns:
        JobAccepted: HTTP 202 with stable job identity/current status.
    Raises:
        ServiceError: Auth, schema, idempotency or persistence error envelope.
    """
    return service.enqueue_index(request, context)


@router.post("/deindex", response_model=JobAccepted, status_code=status.HTTP_202_ACCEPTED)
def deindex_document(
    request: DocumentDeindexRequest,
    context: Annotated[RequestContext, Depends(require_internal_request)],
    service: Annotated[JobService, Depends(get_job_service)],
) -> JobAccepted:
    """Persist an authorized schema-v2 deindex job.

    Args:
        request: Exact document/version/pipeline scope authorized by Java.
        context: Authenticated internal headers including idempotency key.
        service: Request-scoped durable job application service.
    Returns:
        JobAccepted: HTTP 202 with stable job identity/current status.
    Raises:
        ServiceError: Auth, schema, idempotency or persistence error envelope.
    """
    return service.enqueue_deindex(request, context)
