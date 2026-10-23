"""Document worker CLI: python -m app.workers.documents [--once]."""

import argparse
import asyncio
from collections.abc import Sequence

import httpx
from openai import APIConnectionError, APIStatusError
from sqlalchemy.orm import Session

from app.clients.http_document_download import HttpDocumentDownloadClient
from app.clients.openrouter import OpenRouterClient
from app.core.config import get_settings
from app.core.database import build_engine, build_session_factory
from app.pipelines.parsers.pdf import PdfProcessingError
from app.repositories.index_repository import SqlAlchemyDocumentIndexRepository
from app.repositories.job_repository import JobRepository
from app.repositories.models import JobOperation
from app.schemas.indexing import IndexArtifact, IndexDocumentCommand, IndexedChunk
from app.schemas.jobs import ClaimedJob
from app.services.indexing import DocumentIndexWorker


class FencedIndexRepository:
    """Check the job lease immediately before persisting vectors."""

    def __init__(self, session: Session, claim: ClaimedJob) -> None:
        """Bind transaction/claim. Args: session, claim. Returns: None. Raises: none."""
        self._session = session
        self._claim = claim

    def replace_index(
        self,
        *,
        command: IndexDocumentCommand,
        chunks: tuple[IndexedChunk, ...],
        artifact: IndexArtifact,
    ) -> None:
        """Write under row lock.

        Args: command: PDF identity; chunks: validated vectors; artifact: safe metadata.
        Returns: None; changes commit together with job completion.
        Raises: RuntimeError if lease expired/revoked; database or validation errors.
        """
        JobRepository(self._session).guard(self._claim)
        SqlAlchemyDocumentIndexRepository(self._session).replace_index(
            command=command, chunks=chunks, artifact=artifact
        )


async def run_worker(*, once: bool, poll_seconds: float | None = None) -> None:
    """Process persisted PDF jobs using bounded provider calls and fenced leases.

    Args: once: process at most one job then exit; poll_seconds: idle delay, 0.1..60.
    Returns: None; commits successful index/deindex and safe failures.
    Raises: ValueError for settings; database errors stop the worker for supervision.
    """
    settings = get_settings()
    resolved_poll = poll_seconds if poll_seconds is not None else settings.worker_poll_seconds
    if not 0.1 <= resolved_poll <= 60:
        raise ValueError("poll interval must be between 0.1 and 60 seconds")
    if settings.storage_endpoint is None:
        raise ValueError("STORAGE_ENDPOINT is required by the document worker")
    engine = build_engine(settings)
    factory = build_session_factory(engine)
    provider = OpenRouterClient.from_settings(settings)
    downloader = HttpDocumentDownloadClient(
        allowed_origin=str(settings.storage_endpoint),
        allow_insecure_local_http=settings.allow_insecure_local_storage_url,
    )
    try:
        while True:
            with factory() as session:
                repository = JobRepository(session)
                claim = repository.claim(max_attempts=settings.job_max_attempts)
                if claim is not None:
                    try:
                        if claim.operation is JobOperation.DEINDEX:
                            repository.deindex(claim)
                            repository.finish(claim)
                        else:
                            if claim.command is None:
                                raise ValueError("INDEX job requires a document command")
                            worker = DocumentIndexWorker(
                                download_client=downloader,
                                embedding_client=provider,
                                index_repository=FencedIndexRepository(session, claim),
                                embedding_model=settings.openrouter_embedding_model,
                                embedding_dimensions=settings.embedding_dimensions,
                            )
                            artifact = await worker.execute(claim.command)
                            repository.finish(claim, artifact=artifact)
                    except Exception as error:
                        session.rollback()
                        code = (
                            error.code if isinstance(error, PdfProcessingError) else "INDEX_FAILED"
                        )
                        try:
                            if retryable_index_error(error):
                                repository.retry(
                                    claim,
                                    max_attempts=settings.job_max_attempts,
                                    base_seconds=settings.job_retry_base_seconds,
                                )
                            else:
                                repository.finish(claim, error_code=code)
                        except RuntimeError:
                            # An expired/revoked claim must not overwrite another worker's result.
                            session.rollback()
            if once:
                return
            if claim is None:
                await asyncio.sleep(resolved_poll)
    finally:
        await downloader.close()
        await provider.close()
        engine.dispose()


def retryable_index_error(error: Exception) -> bool:
    """Classify transport failures only for idempotent document processing.

    Args: error: caught download/embedding failure.
    Returns: True for connection/timeouts, HTTP 429 and 5xx; False for invalid PDFs/schemas.
    Raises: None. Chat and Quiz generation never use this retry policy.
    """
    if isinstance(error, (httpx.TransportError, APIConnectionError)):
        return True
    if isinstance(error, httpx.HTTPStatusError):
        return error.response.status_code == 429 or error.response.status_code >= 500
    if isinstance(error, APIStatusError):
        return error.status_code == 429 or error.status_code >= 500
    return False


def main(argv: Sequence[str] | None = None) -> int:
    """CLI entry point.

    Args: argv: optional CLI args; --once processes one job; --poll-seconds defaults to 2.
    Returns: 0 on completion, 1 on failure, 130 on interrupt; mutates AI job/index data.
    Raises: SystemExit for invalid CLI input; configuration/database exceptions on startup.
    """
    parser = argparse.ArgumentParser(description="StudyFlow PDF indexing worker")
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--poll-seconds", type=float, default=None)
    args = parser.parse_args(argv)
    try:
        asyncio.run(run_worker(once=args.once, poll_seconds=args.poll_seconds))
    except KeyboardInterrupt:
        return 130
    except Exception:
        print("AI_WORKER_FAILED: check process configuration and dependency availability")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
