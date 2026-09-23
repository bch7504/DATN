"""FastAPI entry point for the internal AI service."""

from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import FastAPI, Request, Response

from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.personal_rag import router as personal_rag_router
from app.api.routes.quizzes import router as quizzes_router
from app.api.routes.slides import router as slides_router
from app.core.errors import install_error_handlers


def create_app() -> FastAPI:
    """Build the internal schema-v2 FastAPI application.

    Args:
        None.
    Returns:
        FastAPI: App with safe errors, request tracing and M1 routes.
    Raises:
        None. External integrations remain lazy until a request/job uses them.
    """
    app = FastAPI(
        title="StudyFlow AI Service",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    install_error_handlers(app)

    @app.middleware("http")
    async def request_id_middleware(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Propagate a safe request ID into responses and error envelopes.

        Args:
            request: Incoming Java internal HTTP request.
            call_next: FastAPI/Starlette downstream handler.
        Returns:
            Response: Downstream response with `X-Request-Id` header.
        Raises:
            Exception: Downstream exceptions handled by registered handlers.
        """
        request_id = request.headers.get("X-Request-Id") or f"req_{uuid4()}"
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response

    app.include_router(health_router, prefix="/internal/v1")
    # Route modules below intentionally expose no operation until their
    # pipelines are implemented. This keeps the scaffold aligned with the
    # documented boundary without returning placeholder production data.
    app.include_router(documents_router, prefix="/internal/v1")
    app.include_router(jobs_router, prefix="/internal/v1")
    app.include_router(personal_rag_router, prefix="/internal/v1")
    app.include_router(slides_router, prefix="/internal/v1")
    app.include_router(quizzes_router, prefix="/internal/v1")
    return app


app = create_app()
