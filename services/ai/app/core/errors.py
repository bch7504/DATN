"""Safe error types and FastAPI handlers for the internal boundary."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ServiceError(Exception):
    """Error safe to expose to the Java caller without provider/document data."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int,
        details: dict[str, str | int | bool | None] | None = None,
    ) -> None:
        """Create a structured service error.

        Args:
            code: Stable machine-readable error code.
            message: Safe caller-facing description without sensitive content.
            status_code: HTTP status returned by the internal API.
            details: Optional scalar validation metadata; defaults to an empty object.
        Returns:
            None. Initializes the exception instance.
        Raises:
            None.
        """
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


def _trace_id(request: Request) -> str:
    """Read the safe request trace identifier.

    Args:
        request: Current FastAPI request populated by request-id middleware.
    Returns:
        str: Existing trace ID or `unknown` if middleware was bypassed.
    Raises:
        None.
    """
    return str(getattr(request.state, "request_id", "unknown"))


def install_error_handlers(app: FastAPI) -> None:
    """Register stable internal error envelopes on an application.

    Args:
        app: FastAPI application being constructed.
    Returns:
        None. Mutates only the application's handler registry.
    Raises:
        None.
    """

    @app.exception_handler(ServiceError)
    async def service_error_handler(request: Request, error: ServiceError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={
                "code": error.code,
                "message": error.message,
                "details": error.details,
                "traceId": _trace_id(request),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, error: RequestValidationError) -> JSONResponse:
        fields = [".".join(str(part) for part in item["loc"]) for item in error.errors()]
        return JSONResponse(
            status_code=422,
            content={
                "code": "VALIDATION_ERROR",
                "message": "Internal request does not match schema v2",
                "details": {"fields": ",".join(fields)},
                "traceId": _trace_id(request),
            },
        )
