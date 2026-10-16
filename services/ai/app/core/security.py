"""Service-to-service authentication and required request context."""

import secrets
from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field

from app.api.dependencies import get_request_settings
from app.core.config import Settings
from app.core.errors import ServiceError

bearer_scheme = HTTPBearer(auto_error=False)


class RequestContext(BaseModel):
    """Trusted context created after internal headers are validated."""

    model_config = ConfigDict(frozen=True)

    request_id: str = Field(
        min_length=3,
        max_length=128,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]*$",
    )
    schema_version: str


async def require_internal_request(
    settings: Annotated[Settings, Depends(get_request_settings)],
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    request_id: Annotated[
        str,
        Header(
            alias="X-Request-Id",
            min_length=3,
            max_length=128,
            pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]*$",
        ),
    ],
    schema_version: Annotated[
        str,
        Header(alias="X-Schema-Version"),
    ],
) -> RequestContext:
    """Authenticate one Java-to-Python request and validate common headers.

    Args:
        settings: Validated process settings.
        credentials: Bearer service credential from the Authorization header.
        request_id: Caller-provided identifier used for cross-service tracing.
        schema_version: Internal contract version expected to equal version 3.

    Returns:
        An immutable trusted RequestContext for downstream handlers.

    Raises:
        ServiceError: If the credential is missing/invalid or the schema
            version is unsupported.
        pydantic.ValidationError: If the request identifier format is invalid.
    """

    expected_token = settings.internal_service_token.get_secret_value()
    supplied_token = credentials.credentials if credentials is not None else ""
    valid_scheme = credentials is not None and credentials.scheme.lower() == "bearer"
    if not valid_scheme or not secrets.compare_digest(supplied_token, expected_token):
        raise ServiceError(
            status_code=401,
            code="INVALID_SERVICE_CREDENTIAL",
            message="Internal service credential is missing or invalid",
        )
    if schema_version != settings.internal_schema_version:
        raise ServiceError(
            status_code=400,
            code="UNSUPPORTED_SCHEMA_VERSION",
            message="X-Schema-Version is not supported",
        )
    return RequestContext(
        request_id=request_id,
        schema_version=schema_version,
    )
