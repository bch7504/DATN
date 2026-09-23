"""Synthetic contract tests for the M1 job HTTP boundary."""

from fastapi.testclient import TestClient

from app.api.dependencies import RequestContext, require_idempotency
from app.main import app
from app.schemas.contracts import DocumentDeindexRequest, DocumentIndexRequest, JobAccepted, JobResult
from app.services.jobs import JobService, get_job_service

HEADERS = {
    "Authorization": "Bearer change_me",
    "X-Request-Id": "req_job_test",
    "X-Schema-Version": "2",
    "Idempotency-Key": "fixture:1:PERSONAL_RAG:INDEX",
}


class FakeJobService:
    """Network-free service fixture returning only synthetic job metadata."""

    def enqueue_index(self, request: DocumentIndexRequest, context: RequestContext) -> JobAccepted:
        """Args: validated request/context. Returns: synthetic queued job. Raises: missing key."""
        require_idempotency(context)
        return JobAccepted(requestId=context.request_id, jobId="00000000-0000-0000-0000-000000000001", status="QUEUED")

    def enqueue_deindex(self, request: DocumentDeindexRequest, context: RequestContext) -> JobAccepted:
        """Args: validated request/context. Returns: synthetic queued job. Raises: missing key."""
        require_idempotency(context)
        return JobAccepted(requestId=context.request_id, jobId="00000000-0000-0000-0000-000000000002", status="QUEUED")

    def get_job(self, job_id: str) -> JobResult:
        """Args: job UUID. Returns: synthetic safe result. Raises: none."""
        return JobResult(
            requestId="req_job_test",
            jobId=job_id,
            documentId="fixture-doc",
            documentVersion=1,
            pipelineType="PERSONAL_RAG",
            status="QUEUED",
            attempts=0,
            errorCode=None,
        )


def _client() -> TestClient:
    """Args: none. Returns: TestClient with fake job persistence. Raises: none."""
    app.dependency_overrides[get_job_service] = lambda: FakeJobService()
    return TestClient(app)


def test_index_returns_schema_v2_job() -> None:
    """Args: none. Returns: None. Raises: AssertionError on route contract drift."""
    try:
        response = _client().post(
            "/internal/v1/documents/index",
            headers=HEADERS,
            json={
                "documentId": "fixture-doc",
                "documentVersion": 1,
                "pipelineType": "PERSONAL_RAG",
                "ownerId": "fixture-owner",
                "signedFileUrl": "https://storage.invalid/fixture",
                "mimeType": "application/pdf",
            },
        )
        assert response.status_code == 202
        assert response.json() == {
            "requestId": "req_job_test",
            "jobId": "00000000-0000-0000-0000-000000000001",
            "status": "QUEUED",
        }
    finally:
        app.dependency_overrides.clear()


def test_index_rejects_missing_idempotency_key() -> None:
    """Args: none. Returns: None. Raises: AssertionError if mutation key is optional."""
    try:
        headers = {key: value for key, value in HEADERS.items() if key != "Idempotency-Key"}
        response = _client().post(
            "/internal/v1/documents/index",
            headers=headers,
            json={
                "documentId": "fixture-doc",
                "documentVersion": 1,
                "pipelineType": "PERSONAL_RAG",
                "ownerId": "fixture-owner",
                "signedFileUrl": "https://storage.invalid/fixture",
                "mimeType": "application/pdf",
            },
        )
        assert response.status_code == 422
        assert response.json()["code"] == "IDEMPOTENCY_KEY_REQUIRED"
    finally:
        app.dependency_overrides.clear()


def test_job_poll_does_not_expose_signed_url() -> None:
    """Args: none. Returns: None. Raises: AssertionError on unsafe output fields."""
    try:
        response = _client().get(
            "/internal/v1/jobs/00000000-0000-0000-0000-000000000001",
            headers={key: value for key, value in HEADERS.items() if key != "Idempotency-Key"},
        )
        assert response.status_code == 200
        assert "signedFileUrl" not in response.json()
        assert response.json()["pipelineType"] == "PERSONAL_RAG"
    finally:
        app.dependency_overrides.clear()
