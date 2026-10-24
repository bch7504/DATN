"""FastAPI application factory for the StudyFlow AI service."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import internal_router
from app.clients.openrouter import OpenRouterClient
from app.core.config import Settings, get_settings
from app.core.database import build_engine, build_session_factory
from app.core.errors import register_exception_handlers
from app.core.observability import install_observability


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure one StudyFlow AI FastAPI application.

    Args:
        settings: Optional validated settings. When omitted, values are loaded
            from the repository-root .env and then overridden by process
            environment variables when the same key is present.

    Returns:
        A configured FastAPI application with internal routes and safe error
        handlers registered.

    Raises:
        pydantic.ValidationError: If required environment configuration is
            missing or invalid.
    """

    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        """Release provider and database resources created for the application.

        Args:
            application: Running FastAPI application.

        Yields:
            Control to FastAPI for the application lifetime.

        Raises:
            RuntimeError: If an owned provider cannot close cleanly.
        """

        yield
        provider = getattr(application.state, "openrouter_client", None)
        if isinstance(provider, OpenRouterClient):
            await provider.close()
        engine = getattr(application.state, "database_engine", None)
        if engine is not None:
            engine.dispose()

    application = FastAPI(
        title=resolved_settings.app_name,
        version=resolved_settings.app_version,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )
    application.state.settings = resolved_settings
    application.state.database_engine = None
    application.state.session_factory = None
    application.state.openrouter_client = None
    if resolved_settings.ai_database_url is not None:
        engine = build_engine(resolved_settings)
        application.state.database_engine = engine
        application.state.session_factory = build_session_factory(engine)
    if resolved_settings.openrouter_api_key is not None:
        application.state.openrouter_client = OpenRouterClient.from_settings(resolved_settings)
    register_exception_handlers(application)
    install_observability(application)
    application.include_router(internal_router)
    return application
