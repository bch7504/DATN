"""Safe structured error handling for internal service boundaries."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from openai import APIError
from sqlalchemy.exc import SQLAlchemyError

from app.core.request_id import safe_request_id
from app.schemas.common import ErrorDetail, ErrorEnvelope


class ServiceError(Exception):
    """Expected error safe to return to the Java caller."""

    def __init__(self, *, status_code: int, code: str, message: str) -> None:
        """Create a safe service error.

        Args:
            status_code: HTTP status returned to the caller.
            code: Stable machine-readable error code.
            message: Safe human-readable message without sensitive data.

        Returns:
            None.

        Raises:
            ValueError: If code or message is blank.
        """

        if not code.strip() or not message.strip():
            raise ValueError("ServiceError code and message must not be blank")
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def _request_id_from(request: Request) -> str | None:
    """Read a safe request identifier from an incoming request.

    Args:
        request: Incoming FastAPI request.

    Returns:
        The request identifier only when its format is valid, otherwise None.

    Raises:
        None.
    """

    return safe_request_id(request.headers.get("X-Request-Id"))


def register_exception_handlers(application: FastAPI) -> None:
    """Register structured exception handlers on an application.

    Args:
        application: FastAPI application being configured.

    Returns:
        None. The function mutates the application's exception-handler table.

    Raises:
        None.
    """

    async def handle_service_error(
        request: Request,
        error: Exception,
    ) -> JSONResponse:
        """Render a safe expected error.

        Args: request: HTTP input; error: expected ServiceError.
        Returns: Error envelope without private exception context.
        Raises: TypeError if registered against an unsupported exception type.
        """
        service_error = error
        if not isinstance(service_error, ServiceError):
            raise TypeError("Expected ServiceError")
        body = ErrorEnvelope(
            error=ErrorDetail(
                code=service_error.code,
                message=service_error.message,
                request_id=_request_id_from(request),
            )
        )
        return JSONResponse(
            status_code=service_error.status_code,
            content=body.model_dump(by_alias=True, exclude_none=True),
        )

    async def handle_validation_error(
        request: Request,
        error: Exception,
    ) -> JSONResponse:
        """Hide raw validation input.

        Args: request: HTTP input; error: request validation failure.
        Returns: Generic 422 envelope without submitted fields or header values.
        Raises: TypeError if invoked for an unsupported exception type.
        """
        if not isinstance(error, RequestValidationError):
            raise TypeError("Expected RequestValidationError")
        body = ErrorEnvelope(
            error=ErrorDetail(
                code="INVALID_REQUEST",
                message="Request headers, path, or body are invalid",
                request_id=_request_id_from(request),
            )
        )
        return JSONResponse(
            status_code=422,
            content=body.model_dump(by_alias=True, exclude_none=True),
        )

    service_handler: Callable[[Request, Exception], Awaitable[JSONResponse]]
    validation_handler: Callable[[Request, Exception], Awaitable[JSONResponse]]
    service_handler = handle_service_error
    validation_handler = handle_validation_error
    application.add_exception_handler(ServiceError, service_handler)
    application.add_exception_handler(RequestValidationError, validation_handler)

    async def handle_dependency_error(request: Request, error: Exception) -> JSONResponse:
        """Map dependency failures safely.

        Args: request: incoming request; error: provider or database failure.
        Returns: Sanitized 502/503 envelope, no provider text or connection values.
        Raises: None.
        """
        is_database_error = isinstance(error, SQLAlchemyError)
        body = ErrorEnvelope(
            error=ErrorDetail(
                code="AI_DATABASE_UNAVAILABLE" if is_database_error else "AI_PROVIDER_UNAVAILABLE",
                message="AI dependency is temporarily unavailable",
                request_id=_request_id_from(request),
            )
        )
        return JSONResponse(
            status_code=503 if is_database_error else 502,
            content=body.model_dump(by_alias=True, exclude_none=True),
        )

    application.add_exception_handler(APIError, handle_dependency_error)
    application.add_exception_handler(SQLAlchemyError, handle_dependency_error)
