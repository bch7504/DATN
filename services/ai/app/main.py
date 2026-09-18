"""FastAPI entry point for the internal AI service."""

from fastapi import FastAPI

from app.api.routes.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="StudyFlow AI Service",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.include_router(health_router, prefix="/internal/v1")
    return app


app = create_app()

