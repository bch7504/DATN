"""FastAPI entry point for the internal AI service."""

from fastapi import FastAPI

from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router
from app.api.routes.personal_rag import router as personal_rag_router
from app.api.routes.quizzes import router as quizzes_router
from app.api.routes.slides import router as slides_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="StudyFlow AI Service",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.include_router(health_router, prefix="/internal/v1")
    # Route modules below intentionally expose no operation until their
    # pipelines are implemented. This keeps the scaffold aligned with the
    # documented boundary without returning placeholder production data.
    app.include_router(documents_router, prefix="/internal/v1")
    app.include_router(personal_rag_router, prefix="/internal/v1")
    app.include_router(slides_router, prefix="/internal/v1")
    app.include_router(quizzes_router, prefix="/internal/v1")
    return app


app = create_app()
