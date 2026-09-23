"""Authentication and version dependencies for Java-to-Python requests."""

import secrets
from dataclasses import dataclass

from fastapi import Header

from app.core.config import settings
from app.core.errors import ServiceError


@dataclass(frozen=True)
class RequestContext:
    """Authorized metadata propagated through one internal request."""

    request_id: str
    schema_version: int
    idempotency_key: str | None = None


def require_internal_request(
    authorization: str = Header(alias="Authorization"),
    x_request_id: str = Header(alias="X-Request-Id", min_length=3, max_length=128),
    x_schema_version: int = Header(alias="X-Schema-Version"),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=200),
) -> RequestContext:
    """Authenticate Java and validate the supported internal schema.

    Args:
        authorization: Bearer service credential; user JWTs are not accepted.
        x_request_id: Required cross-service trace identifier.
        x_schema_version: Contract version; only version 2 is supported.
        idempotency_key: Optional mutation key, validated by mutation handlers.
    Returns:
        RequestContext: Authorized safe metadata for route/service calls.
    Raises:
        ServiceError: `UNAUTHORIZED_SERVICE` or `UNSUPPORTED_SCHEMA_VERSION`.
    """
    expected = settings.internal_service_token.get_secret_value()
    supplied = authorization.removeprefix("Bearer ").strip()
    if not supplied or not secrets.compare_digest(supplied, expected):
        raise ServiceError("UNAUTHORIZED_SERVICE", "Invalid internal service credential", 401)
    if x_schema_version != 2:
        raise ServiceError(
            "UNSUPPORTED_SCHEMA_VERSION",
            "Only internal schema version 2 is supported",
            409,
            {"supportedVersion": 2},
        )
    return RequestContext(x_request_id, x_schema_version, idempotency_key)


def require_idempotency(context: RequestContext) -> str:
    """Require a non-empty mutation idempotency key.

    Args:
        context: Authorized request context returned by `require_internal_request`.
    Returns:
        str: Validated idempotency key.
    Raises:
        ServiceError: `IDEMPOTENCY_KEY_REQUIRED` when absent or blank.
    """
    if not (context.idempotency_key or "").strip():
        raise ServiceError("IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required", 422)
    return context.idempotency_key.strip()
