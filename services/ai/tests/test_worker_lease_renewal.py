"""Synthetic coverage for long PDF processing and cancellation on lost leases."""

import asyncio
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.repositories.models import JobOperation
from app.schemas.indexing import IndexArtifact, IndexDocumentCommand
from app.schemas.jobs import ClaimedJob
from app.services.indexing import DocumentIndexWorker
from app.workers.documents import _index_with_lease


def _claim() -> ClaimedJob:
    """Args: none. Returns: synthetic INDEX claim. Raises: schema validation errors."""
    document_id = uuid4()
    return ClaimedJob(
        job_id=uuid4(),
        claim_token=uuid4(),
        operation=JobOperation.INDEX,
        document_id=document_id,
        document_version=1,
        pipeline_version="pdf-v1",
        lease_until=datetime.now(UTC) + timedelta(minutes=10),
        command=IndexDocumentCommand(
            request_id="synthetic-long-pdf",
            idempotency_key="synthetic-long-pdf-operation",
            document_id=document_id,
            document_version=1,
            pipeline_version="pdf-v1",
            owner_id=uuid4(),
            source_type="COURSE_MATERIAL_PDF",
            signed_url="https://storage.invalid/synthetic.pdf",
            mime_type="application/pdf",
        ),
    )


def test_indexing_renews_lease_and_stops_heartbeat_after_completion() -> None:
    """Long indexing renews the same claim and leaves no background task behind."""
    artifact = IndexArtifact(
        page_count=61,
        chunk_count=100,
        embedding_model="synthetic-embedding",
        embedding_dimensions=1024,
        pipeline_version="pdf-v1",
    )

    async def finish_later(command: IndexDocumentCommand) -> IndexArtifact:
        """Args: synthetic command. Returns: delayed artifact. Raises: cancellation."""
        assert command.document_version == 1
        await asyncio.sleep(0.04)
        return artifact

    worker = MagicMock(spec=DocumentIndexWorker)
    worker.execute = AsyncMock(side_effect=finish_later)
    factory = MagicMock(spec=sessionmaker[Session])
    claim = _claim()
    with patch("app.workers.documents.JobRepository") as repository:
        result = asyncio.run(_index_with_lease(worker, claim, factory, interval_seconds=0.01))

        assert result == artifact
        assert repository.return_value.renew.call_count >= 1
        assert all(call.args[0] == claim for call in repository.return_value.renew.call_args_list)


def test_lost_lease_cancels_provider_work_before_persistence() -> None:
    """A revoked/lost lease cancels the pipeline instead of letting stale work finish."""
    cancelled: list[bool] = []

    async def wait_for_cancel(command: IndexDocumentCommand) -> IndexArtifact:
        """Args: synthetic command. Returns: never. Raises: CancelledError when lease is lost."""
        assert command.document_version == 1
        try:
            await asyncio.sleep(1)
        except asyncio.CancelledError:
            cancelled.append(True)
            raise
        raise AssertionError("Indexing should have been cancelled")

    worker = MagicMock(spec=DocumentIndexWorker)
    worker.execute = AsyncMock(side_effect=wait_for_cancel)
    factory = MagicMock(spec=sessionmaker[Session])
    with patch("app.workers.documents.JobRepository") as repository:
        repository.return_value.renew.side_effect = RuntimeError("lease revoked")
        with pytest.raises(RuntimeError, match="lease revoked"):
            asyncio.run(_index_with_lease(worker, _claim(), factory, interval_seconds=0.01))

    assert cancelled == [True]
