"""Liveness and readiness endpoint for Java and deployment probes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_request_settings
from app.core.config import Settings
from app.core.security import RequestContext, require_internal_request
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def get_health(
    context: Annotated[RequestContext, Depends(require_internal_request)],
    settings: Annotated[Settings, Depends(get_request_settings)],
) -> HealthResponse:
    """Return service liveness and configuration readiness.

    Args:
        context: Authenticated internal request context containing the request
            identifier and accepted schema version.
        settings: Validated application settings.

    Returns:
        A structured health response. The response contains no credentials,
        provider payloads, document content, or database connection values.

    Raises:
        ServiceError: Raised by the authentication dependency when service
            credentials or required headers are invalid.
    """

    missing_configuration = settings.missing_readiness_configuration()
    return HealthResponse(
        service=settings.app_name,
        version=settings.app_version,
        status="UP",
        readiness="NOT_READY" if missing_configuration else "READY",
        schema_version=context.schema_version,
        request_id=context.request_id,
        missing_configuration=missing_configuration,
    )
