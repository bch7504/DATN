"""Shared synthetic fixtures for AI service tests."""

import pytest
from fastapi import FastAPI

from app.core.config import Settings
from app.main import create_app

TEST_SERVICE_TOKEN = "test-service-token-123456789"


@pytest.fixture
def application() -> FastAPI:
    """Create an application with synthetic non-production configuration.

    Args:
        None.

    Returns:
        A configured FastAPI application.

    Raises:
        None.
    """

    settings = Settings(
        _env_file=None,
        INTERNAL_SERVICE_TOKEN=TEST_SERVICE_TOKEN,
        AI_DATABASE_URL="postgresql+psycopg://test:test@localhost:5432/studyflow",
        OPENROUTER_API_KEY="test-openrouter-key",
        STORAGE_ENDPOINT="https://storage.invalid",
        app_environment="test",
    )
    return create_app(settings)


@pytest.fixture
def anyio_backend() -> str:
    """Select asyncio for tests marked with pytest's AnyIO integration.

    Args:
        None.

    Returns:
        The asyncio backend name.

    Raises:
        None.
    """

    return "asyncio"


@pytest.fixture
def valid_headers() -> dict[str, str]:
    """Return valid internal headers containing only synthetic values.

    Args:
        None.

    Returns:
        A new dictionary with service authorization, request ID, and schema
        version headers.

    Raises:
        None.
    """

    return {
        "Authorization": f"Bearer {TEST_SERVICE_TOKEN}",
        "X-Request-Id": "req_health_001",
        "X-Schema-Version": "3",
    }
