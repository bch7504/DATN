from fastapi.testclient import TestClient

from app.main import app

HEADERS = {
    "Authorization": "Bearer change_me",
    "X-Request-Id": "req_health_test",
    "X-Schema-Version": "2",
}


def test_health() -> None:
    """Args: none. Returns: None. Raises: AssertionError on health schema drift."""
    response = TestClient(app).get("/internal/v1/health", headers=HEADERS)

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "studyflow-ai",
        "schemaVersion": 2,
        "ready": False,
    }
    assert response.headers["X-Request-Id"] == "req_health_test"


def test_health_rejects_wrong_service_credential() -> None:
    """Args: none. Returns: None. Raises: AssertionError if service auth is bypassed."""
    response = TestClient(app).get(
        "/internal/v1/health",
        headers={**HEADERS, "Authorization": "Bearer wrong"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED_SERVICE"
    assert response.json()["traceId"] == "req_health_test"


def test_health_rejects_unsupported_schema() -> None:
    """Args: none. Returns: None. Raises: AssertionError if version checks drift."""
    response = TestClient(app).get(
        "/internal/v1/health",
        headers={**HEADERS, "X-Schema-Version": "1"},
    )

    assert response.status_code == 409
    assert response.json()["code"] == "UNSUPPORTED_SCHEMA_VERSION"
