"""Contract tests for the internal health endpoint."""

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


@pytest.mark.anyio
async def test_health_returns_structured_ready_response(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Verify valid internal input returns the documented health schema.

    Args:
        application: FastAPI application configured with synthetic settings.
        valid_headers: Valid internal service headers.

    Returns:
        None.

    Raises:
        AssertionError: If status code or response schema differs from the
            internal contract.
    """

    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/internal/v1/health", headers=valid_headers)

    assert response.status_code == 200
    assert response.json() == {
        "service": "StudyFlow AI Service",
        "version": "0.1.0",
        "status": "UP",
        "readiness": "READY",
        "schemaVersion": "3",
        "requestId": "req_health_001",
        "missingConfiguration": [],
    }
    assert "token" not in response.text.lower()


@pytest.mark.anyio
async def test_health_rejects_invalid_request_id(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Verify invalid common input uses the structured validation envelope.

    Args:
        application: FastAPI application configured with synthetic settings.
        valid_headers: Valid headers that will be copied and modified.

    Returns:
        None.

    Raises:
        AssertionError: If invalid input is accepted or leaks validation
            internals.
    """

    headers = {**valid_headers, "X-Request-Id": "invalid request id"}
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/internal/v1/health", headers=headers)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_REQUEST"
    assert "requestId" not in response.json()["error"]
    assert "invalid request id" not in response.text
