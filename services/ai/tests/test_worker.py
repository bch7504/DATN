"""Unit tests for bounded M1 job worker behavior."""

from app.core.config import Settings
from app.models import IndexJobModel
from app.workers.index_worker import RetryableJobError, TerminalJobError, run_once


class FakeRepository:
    """Single-job in-memory repository used without PostgreSQL."""

    def __init__(self, job: IndexJobModel | None) -> None:
        """Args: optional synthetic job. Returns: None. Raises: none."""
        self.job = job

    def claim_next(self) -> IndexJobModel | None:
        """Args: none. Returns: one RUNNING job or None. Raises: none."""
        if self.job is None or self.job.status != "QUEUED":
            return None
        self.job.status = "RUNNING"
        self.job.attempts += 1
        return self.job

    def mark_succeeded(self, job_id: str) -> None:
        """Args: job ID. Returns: None. Raises: AssertionError on wrong job."""
        assert self.job is not None and self.job.id == job_id
        self.job.status = "SUCCEEDED"
        self.job.signed_file_url = None

    def mark_failed(
        self,
        job_id: str,
        error_code: str,
        *,
        retryable: bool,
        max_attempts: int,
        retry_base_seconds: int,
    ) -> None:
        """Args: failure policy. Returns: None. Raises: AssertionError on wrong job."""
        del retry_base_seconds
        assert self.job is not None and self.job.id == job_id
        self.job.error_code = error_code
        self.job.status = "QUEUED" if retryable and self.job.attempts < max_attempts else "FAILED"


class SuccessProcessor:
    """Synthetic successful processor."""

    def process(self, job: IndexJobModel) -> None:
        """Args: claimed job. Returns: None. Raises: none."""
        assert job.status == "RUNNING"


class RetryProcessor:
    """Synthetic transient processor."""

    def process(self, job: IndexJobModel) -> None:
        """Args: claimed job. Returns: None. Raises: RetryableJobError."""
        del job
        raise RetryableJobError("PROVIDER_TIMEOUT")


class TerminalProcessor:
    """Synthetic terminal processor."""

    def process(self, job: IndexJobModel) -> None:
        """Args: claimed job. Returns: None. Raises: TerminalJobError."""
        del job
        raise TerminalJobError("PDF_ENCRYPTED")


def _job() -> IndexJobModel:
    """Args: none. Returns: synthetic queued job. Raises: none."""
    return IndexJobModel(
        id="00000000-0000-0000-0000-000000000001",
        request_id="req_worker",
        idempotency_key="fixture:1:index",
        operation="INDEX",
        document_id="fixture-doc",
        document_version=1,
        pipeline_type="PERSONAL_RAG",
        owner_id="fixture-owner",
        signed_file_url="https://storage.invalid/fixture",
        mime_type="application/pdf",
        status="QUEUED",
        attempts=0,
    )


def test_worker_marks_success_and_clears_signed_url() -> None:
    """Args: none. Returns: None. Raises: AssertionError on lifecycle drift."""
    repository = FakeRepository(_job())
    assert run_once(repository, SuccessProcessor()) is True  # type: ignore[arg-type]
    assert repository.job is not None
    assert repository.job.status == "SUCCEEDED"
    assert repository.job.signed_file_url is None


def test_worker_retries_only_until_max_attempts() -> None:
    """Args: none. Returns: None. Raises: AssertionError on unbounded retry."""
    repository = FakeRepository(_job())
    config = Settings(ai_job_max_attempts=2, ai_job_retry_base_seconds=1)
    assert run_once(repository, RetryProcessor(), config) is True  # type: ignore[arg-type]
    assert repository.job is not None and repository.job.status == "QUEUED"
    assert run_once(repository, RetryProcessor(), config) is True  # type: ignore[arg-type]
    assert repository.job.status == "FAILED"
    assert repository.job.error_code == "PROVIDER_TIMEOUT"


def test_worker_does_not_retry_terminal_error() -> None:
    """Args: none. Returns: None. Raises: AssertionError on invalid retry."""
    repository = FakeRepository(_job())
    assert run_once(repository, TerminalProcessor()) is True  # type: ignore[arg-type]
    assert repository.job is not None
    assert repository.job.status == "FAILED"
    assert repository.job.error_code == "PDF_ENCRYPTED"
