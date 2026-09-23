"""Safe job polling route for Java."""

from typing import Annotated

from fastapi import APIRouter, Depends, Path

from app.api.dependencies import RequestContext, require_internal_request
from app.schemas.contracts import JobResult
from app.services.jobs import JobService, get_job_service

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobResult)
def get_job(
    job_id: Annotated[str, Path(min_length=36, max_length=36)],
    context: Annotated[RequestContext, Depends(require_internal_request)],
    service: Annotated[JobService, Depends(get_job_service)],
) -> JobResult:
    """Return one safe background job status.

    Args:
        job_id: UUID returned by index/deindex.
        context: Authenticated schema-v2 internal request context.
        service: Request-scoped job application service.
    Returns:
        JobResult: Status/attempt/error metadata without signed URL/content.
    Raises:
        ServiceError: Auth, schema, not-found or persistence error envelope.
    """
    del context
    return service.get_job(job_id)
