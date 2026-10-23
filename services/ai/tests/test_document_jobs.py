"""Job API contracts and worker lease fencing with synthetic fixtures."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.orm import Session

from app.api.routes.documents import get_job_repository
from app.repositories.job_repository import JobRepository
from app.repositories.models import IndexJob, JobOperation, JobStatus
from app.schemas.jobs import ClaimedJob, DeindexRequest, IndexRequest, JobResponse


class StubJobs:
    """Minimal deterministic job boundary for HTTP contract tests."""

    def enqueue(
        self, *, payload: IndexRequest | DeindexRequest, request_id: str, idempotency_key: str
    ) -> JobResponse:
        """Args: payload, request_id, key. Returns: safe accepted metadata. Raises: none."""
        return JobResponse(
            request_id=request_id, job_id=UUID(int=1), status=JobStatus.PENDING, attempt=0
        )

    def get(self, *, job_id: UUID, request_id: str) -> JobResponse:
        """Args: job_id, trace. Returns: safe polling metadata. Raises: none."""
        return JobResponse(
            request_id=request_id, job_id=job_id, status=JobStatus.RUNNING, attempt=1
        )


@pytest.mark.anyio
async def test_document_job_acceptance_validation_and_safe_polling(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Exercise async acceptance, invalid upload, and signed-URL-free polling."""
    application.dependency_overrides[get_job_repository] = StubJobs
    payload = {
        "documentId": str(uuid4()),
        "documentVersion": 1,
        "pipelineVersion": "pdf-v1",
        "ownerId": str(uuid4()),
        "sourceType": "PERSONAL_PDF",
        "signedUrl": "https://storage.invalid/test.pdf?signature=synthetic-only",
        "mimeType": "application/pdf",
    }
    headers = {**valid_headers, "Idempotency-Key": "synthetic-index-key"}
    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as client:
        response = await client.post("/internal/v1/documents/index", json=payload, headers=headers)
        assert response.status_code == 202
        assert set(response.json()) == {"requestId", "jobId", "status"}
        poll = await client.get(f"/internal/v1/jobs/{response.json()['jobId']}", headers=headers)
        invalid = await client.post(
            "/internal/v1/documents/index",
            headers=headers,
            json={**payload, "mimeType": "application/vnd.ms-powerpoint"},
        )
        insecure_remote = await client.post(
            "/internal/v1/documents/index",
            headers=headers,
            json={**payload, "signedUrl": "http://storage.invalid/test.pdf"},
        )
    assert poll.status_code == 200
    assert "signature" not in poll.text and "signedUrl" not in poll.text
    assert invalid.status_code == 422
    assert insecure_remote.status_code == 422
    assert insecure_remote.json()["error"]["code"] == "INVALID_SIGNED_URL"


def test_worker_with_expired_or_replaced_claim_cannot_persist() -> None:
    """A resumed old worker cannot overwrite the result of a newer worker or revoke."""
    token = uuid4()
    claim = ClaimedJob(
        job_id=uuid4(),
        claim_token=token,
        operation=JobOperation.DEINDEX,
        document_id=uuid4(),
        document_version=1,
        pipeline_version="pdf-v1",
        lease_until=datetime.now(UTC) + timedelta(minutes=5),
    )
    session = MagicMock(spec=Session)
    job = IndexJob(
        id=claim.job_id,
        status=JobStatus.RUNNING.value,
        claim_token=uuid4(),
        lease_until=claim.lease_until,
    )
    session.scalar.return_value = job
    repository = JobRepository(session)
    with pytest.raises(RuntimeError, match="no longer valid"):
        repository.deindex(claim)
    assert all(
        "pg_advisory_xact_lock" in str(call.args[0]) for call in session.execute.call_args_list
    )
    job.claim_token = token
    job.lease_until = datetime.now(UTC) - timedelta(seconds=1)
    with pytest.raises(RuntimeError, match="no longer valid"):
        repository.deindex(claim)
    assert all(
        "pg_advisory_xact_lock" in str(call.args[0]) for call in session.execute.call_args_list
    )
