"""Contract tests for Java-to-Python service authentication."""

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


@pytest.mark.anyio
async def test_health_rejects_missing_service_credential(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Verify a request without service credentials is rejected.

    Args:
        application: FastAPI application configured with synthetic settings.
        valid_headers: Valid headers copied without Authorization.

    Returns:
        None.

    Raises:
        AssertionError: If the request is accepted or the error schema changes.
    """

    headers = {key: value for key, value in valid_headers.items() if key != "Authorization"}
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/internal/v1/health", headers=headers)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_SERVICE_CREDENTIAL"


@pytest.mark.anyio
async def test_health_rejects_wrong_service_credential(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Verify a wrong service credential is rejected without being echoed.

    Args:
        application: FastAPI application configured with synthetic settings.
        valid_headers: Valid headers copied with a wrong credential.

    Returns:
        None.

    Raises:
        AssertionError: If the request is accepted or the credential leaks.
    """

    headers = {**valid_headers, "Authorization": "Bearer wrong-token-value"}
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/internal/v1/health", headers=headers)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_SERVICE_CREDENTIAL"
    assert "wrong-token-value" not in response.text


@pytest.mark.anyio
async def test_health_rejects_unsupported_schema_version(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Verify callers using another contract version receive a safe error.

    Args:
        application: FastAPI application configured with synthetic settings.
        valid_headers: Valid headers copied with an unsupported version.

    Returns:
        None.

    Raises:
        AssertionError: If the request is accepted or the error schema changes.
    """

    headers = {**valid_headers, "X-Schema-Version": "2"}
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/internal/v1/health", headers=headers)

    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "UNSUPPORTED_SCHEMA_VERSION",
            "message": "X-Schema-Version is not supported",
            "requestId": "req_health_001",
        }
    }
