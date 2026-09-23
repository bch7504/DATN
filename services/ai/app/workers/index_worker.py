"""Bounded-retry worker orchestration without M2 parsing implementation."""

from typing import Protocol

from app.core.config import Settings, settings
from app.models import IndexJobModel
from app.repositories.jobs import JobRepository


class JobProcessor(Protocol):
    """M2 processor boundary consumed by the durable M1 worker."""

    def process(self, job: IndexJobModel) -> None:
        """Process one claimed job.

        Args:
            job: RUNNING index/deindex job with authorized metadata.
        Returns:
            None after all transactional side effects succeed.
        Raises:
            RetryableJobError: Safe transient failure eligible for bounded retry.
            TerminalJobError: Safe non-retryable validation/processing failure.
        """
        ...


class RetryableJobError(Exception):
    """Transient worker failure represented only by a safe code."""

    def __init__(self, error_code: str) -> None:
        """Create a retryable failure.

        Args:
            error_code: Stable code without document/provider content.
        Returns:
            None. Initializes the exception.
        Raises:
            None.
        """
        super().__init__(error_code)
        self.error_code = error_code


class TerminalJobError(Exception):
    """Non-retryable worker failure represented only by a safe code."""

    def __init__(self, error_code: str) -> None:
        """Create a terminal failure.

        Args:
            error_code: Stable code without document/provider content.
        Returns:
            None. Initializes the exception.
        Raises:
            None.
        """
        super().__init__(error_code)
        self.error_code = error_code


def run_once(
    repository: JobRepository,
    processor: JobProcessor,
    config: Settings = settings,
) -> bool:
    """Claim and process at most one job with bounded exponential retry.

    Args:
        repository: Durable PostgreSQL job repository.
        processor: Injected M2 implementation; no parser is bundled in M1.
        config: Retry limits and delay settings.
    Returns:
        bool: True when a job was claimed, False when the queue had no due work.
    Raises:
        sqlalchemy.exc.SQLAlchemyError: Claim/status persistence failed.
        Exception: Unexpected processor bugs are persisted as terminal failure then re-raised.
    """
    job = repository.claim_next()
    if job is None:
        return False
    try:
        processor.process(job)
    except RetryableJobError as error:
        repository.mark_failed(
            job.id,
            error.error_code,
            retryable=True,
            max_attempts=config.ai_job_max_attempts,
            retry_base_seconds=config.ai_job_retry_base_seconds,
        )
    except TerminalJobError as error:
        repository.mark_failed(
            job.id,
            error.error_code,
            retryable=False,
            max_attempts=config.ai_job_max_attempts,
            retry_base_seconds=config.ai_job_retry_base_seconds,
        )
    except Exception:
        repository.mark_failed(
            job.id,
            "UNEXPECTED_WORKER_ERROR",
            retryable=False,
            max_attempts=config.ai_job_max_attempts,
            retry_base_seconds=config.ai_job_retry_base_seconds,
        )
        raise
    else:
        repository.mark_succeeded(job.id)
    return True
