"""Authenticated liveness and configuration readiness endpoint."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.dependencies import RequestContext, require_internal_request
from app.core.config import settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Stable schema-v2 health response without secret/provider payload."""

    status: Literal["ok"]
    service: Literal["studyflow-ai"]
    schema_version: Literal[2] = Field(alias="schemaVersion")
    ready: bool


@router.get("/health", response_model=HealthResponse)
def health(
    context: Annotated[RequestContext, Depends(require_internal_request)],
) -> HealthResponse:
    """Return process liveness and configuration-only readiness.

    Args:
        context: Authenticated schema-v2 request metadata from Java.
    Returns:
        HealthResponse: Liveness `ok`; readiness never calls paid providers.
    Raises:
        ServiceError: Invalid service credential or schema version.
    """
    del context
    return HealthResponse(status="ok", service="studyflow-ai", schemaVersion=2, ready=settings.is_ready())
