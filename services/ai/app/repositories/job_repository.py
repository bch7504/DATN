"""Persistent document jobs with stable keys and fenced worker leases."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_, delete, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.errors import ServiceError
from app.repositories.document_lock import lock_document_version
from app.repositories.models import (
    DocumentChunk,
    DocumentIndex,
    IndexJob,
    IndexStatus,
    JobOperation,
    JobStatus,
)
from app.schemas.indexing import IndexArtifact, IndexDocumentCommand
from app.schemas.jobs import ClaimedJob, DeindexRequest, IndexRequest, JobResponse


class JobRepository:
    """Owns only ai.index_jobs and document indexes; never business tables."""

    def __init__(self, session: Session) -> None:
        """Bind session. Args: session: AI-role DB session. Returns: None. Raises: none."""
        self.session = session

    def enqueue(
        self, *, payload: IndexRequest | DeindexRequest, request_id: str, idempotency_key: str
    ) -> JobResponse:
        """Reserve a stable document operation and reject key reuse with different input.

        Args: payload: document mutation; request_id: trace; idempotency_key: stable Java key.
        Returns: Existing or newly committed job; deindex immediately disables retrieval.
        Raises: ServiceError on key conflicts; SQLAlchemyError on DB failure.
        """
        # Lock even when no index/job row exists yet. Otherwise a concurrent
        # revoke could miss an uncommitted index enqueue or worker insert.
        lock_document_version(
            self.session, document_id=payload.document_id, version=payload.document_version
        )
        is_index = isinstance(payload, IndexRequest)
        if is_index:
            revoked = self.session.scalar(
                select(IndexJob.id)
                .where(
                    IndexJob.document_id == payload.document_id,
                    IndexJob.document_version == payload.document_version,
                    IndexJob.pipeline_version == payload.pipeline_version,
                    IndexJob.operation == JobOperation.DEINDEX.value,
                )
                .limit(1)
            )
            if revoked is not None:
                raise ServiceError(
                    status_code=409,
                    code="DOCUMENT_REVOKED",
                    message="This document index version has been revoked",
                )
        operation = JobOperation.INDEX if is_index else JobOperation.DEINDEX
        values = {
            "request_id": request_id,
            "idempotency_key": idempotency_key,
            "operation": operation.value,
            "document_id": payload.document_id,
            "document_version": payload.document_version,
            "pipeline_version": payload.pipeline_version,
            "source_type": payload.source_type.value if is_index else "DEINDEX_SCOPE",
            "owner_id": payload.owner_id if is_index else None,
            "signed_url": str(payload.signed_url) if is_index else None,
            "mime_type": payload.mime_type if is_index else None,
        }
        self.session.execute(
            insert(IndexJob)
            .values(**values)
            .on_conflict_do_nothing(index_elements=[IndexJob.idempotency_key])
        )
        job = self.session.scalar(
            select(IndexJob).where(IndexJob.idempotency_key == idempotency_key).with_for_update()
        )
        if job is None:
            raise RuntimeError("job reservation failed")
        checked = (
            job.operation == operation.value
            and job.document_id == payload.document_id
            and job.document_version == payload.document_version
            and job.pipeline_version == payload.pipeline_version
        )
        if is_index:
            checked = checked and (
                job.owner_id == payload.owner_id and job.source_type == payload.source_type.value
            )
        if not checked:
            self.session.rollback()
            raise ServiceError(
                status_code=409,
                code="IDEMPOTENCY_CONFLICT",
                message="Idempotency key already belongs to another operation",
            )
        if not is_index:
            # Stop retrieval immediately and cancel older queued/running index work.
            self.session.execute(
                update(DocumentIndex)
                .where(
                    DocumentIndex.document_id == payload.document_id,
                    DocumentIndex.document_version == payload.document_version,
                    DocumentIndex.pipeline_version == payload.pipeline_version,
                )
                .values(status=IndexStatus.DELETED.value)
            )
            self.session.execute(
                update(IndexJob)
                .where(
                    IndexJob.document_id == payload.document_id,
                    IndexJob.document_version == payload.document_version,
                    IndexJob.pipeline_version == payload.pipeline_version,
                    IndexJob.operation == JobOperation.INDEX.value,
                    IndexJob.status.in_([JobStatus.PENDING.value, JobStatus.RUNNING.value]),
                )
                .values(
                    status=JobStatus.FAILED.value,
                    error_code="DOCUMENT_REVOKED",
                    signed_url=None,
                    claim_token=None,
                    lease_until=None,
                )
            )
        self.session.commit()
        return self._response(job, request_id)

    def get(self, *, job_id: UUID, request_id: str) -> JobResponse:
        """Poll safe metadata.

        Args: job_id, request_id. Returns: response. Raises: 404/DB errors.
        """
        job = self.session.get(IndexJob, job_id)
        if job is None:
            raise ServiceError(
                status_code=404, code="JOB_NOT_FOUND", message="AI job was not found"
            )
        return self._response(job, request_id)

    def claim(self, *, lease_seconds: int = 600, max_attempts: int = 3) -> ClaimedJob | None:
        """Claim oldest eligible work using SKIP LOCKED and a fresh fencing token.

        Args: lease_seconds: positive lease TTL; max_attempts: positive crash recovery limit.
        Returns: Committed immutable claim or None; expired final attempts become FAILED.
        Raises: ValueError on limits; SQLAlchemyError on storage failure.
        """
        if lease_seconds < 1 or max_attempts < 1:
            raise ValueError("lease and attempts must be positive")
        now = datetime.now(UTC)
        self.session.execute(
            update(IndexJob)
            .where(
                IndexJob.status == JobStatus.RUNNING.value,
                IndexJob.lease_until < now,
                IndexJob.attempt >= max_attempts,
            )
            .values(
                status=JobStatus.FAILED.value,
                error_code="JOB_LEASE_EXHAUSTED",
                signed_url=None,
                claim_token=None,
                lease_until=None,
            )
        )
        job = self.session.scalar(
            select(IndexJob)
            .where(
                IndexJob.attempt < max_attempts,
                or_(
                    and_(
                        IndexJob.status == JobStatus.PENDING.value,
                        or_(IndexJob.lease_until.is_(None), IndexJob.lease_until <= now),
                    ),
                    and_(IndexJob.status == JobStatus.RUNNING.value, IndexJob.lease_until < now),
                ),
            )
            .order_by(IndexJob.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if job is None:
            self.session.commit()
            return None
        job.status = JobStatus.RUNNING.value
        job.error_code = None
        job.attempt += 1
        job.claim_token = uuid4()
        job.lease_until = now + timedelta(seconds=lease_seconds)
        command = None
        if job.operation == JobOperation.INDEX.value:
            command = IndexDocumentCommand(
                request_id=job.request_id,
                idempotency_key=job.idempotency_key,
                document_id=job.document_id,
                document_version=job.document_version,
                owner_id=job.owner_id,
                source_type=job.source_type,
                pipeline_version=job.pipeline_version,
                signed_url=job.signed_url,
                mime_type=job.mime_type,
            )
        claim = ClaimedJob(
            job_id=job.id,
            claim_token=job.claim_token,
            operation=job.operation,
            document_id=job.document_id,
            document_version=job.document_version,
            pipeline_version=job.pipeline_version,
            lease_until=job.lease_until,
            command=command,
        )
        self.session.commit()
        return claim

    def guard(self, claim: ClaimedJob) -> IndexJob:
        """Lock and validate a worker claim before any result writes.

        Args: claim: immutable worker lease.
        Returns: Locked job row until caller commits/rolls back.
        Raises: RuntimeError if expired, revoked, or owned by another worker.
        """
        lock_document_version(
            self.session, document_id=claim.document_id, version=claim.document_version
        )
        job = self.session.scalar(
            select(IndexJob)
            .where(IndexJob.id == claim.job_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if (
            job is None
            or job.status != JobStatus.RUNNING.value
            or job.claim_token != claim.claim_token
            or job.lease_until is None
            or job.lease_until <= datetime.now(UTC)
        ):
            raise RuntimeError("document job lease is no longer valid")
        return job

    def finish(
        self,
        claim: ClaimedJob,
        *,
        artifact: IndexArtifact | None = None,
        error_code: str | None = None,
    ) -> None:
        """Complete a guarded job and commit its index changes atomically.

        Args: claim: lease; artifact: index metadata; error_code: safe failure code.
        Returns: None; signed URL is removed from terminal jobs.
        Raises: RuntimeError for stale claim; SQLAlchemyError on persistence failure.
        """
        job = self.guard(claim)
        job.status = JobStatus.FAILED.value if error_code else JobStatus.SUCCEEDED.value
        job.error_code = error_code
        job.artifact_metadata = artifact.model_dump(mode="json") if artifact else None
        job.signed_url = None
        job.claim_token = None
        job.lease_until = None
        self.session.commit()

    def deindex(self, claim: ClaimedJob) -> None:
        """Remove revoked chunks under a valid lease.

        Args: claim: DEINDEX job lease.
        Returns: None; caller commits with finish().
        Raises: RuntimeError for stale lease; ValueError for wrong operation; DB errors.
        """
        if claim.operation is not JobOperation.DEINDEX:
            raise ValueError("deindex requires a DEINDEX job")
        self.guard(claim)
        indexes = select(DocumentIndex.id).where(
            DocumentIndex.document_id == claim.document_id,
            DocumentIndex.document_version == claim.document_version,
            DocumentIndex.pipeline_version == claim.pipeline_version,
        )
        self.session.execute(delete(DocumentChunk).where(DocumentChunk.index_id.in_(indexes)))
        self.session.execute(
            update(DocumentIndex)
            .where(DocumentIndex.id.in_(indexes))
            .values(status=IndexStatus.DELETED.value)
        )

    def retry(self, claim: ClaimedJob, *, max_attempts: int, base_seconds: float) -> None:
        """Schedule a safe download/embedding retry with bounded exponential backoff.

        Args: claim: active lease; max_attempts: total try cap; base_seconds: positive delay.
        Returns: None; commits PENDING or terminal FAILED state.
        Raises: ValueError for limits; RuntimeError for stale lease; database errors.
        """
        if max_attempts < 1 or base_seconds <= 0:
            raise ValueError("retry limits must be positive")
        job = self.guard(claim)
        if job.attempt >= max_attempts:
            self.finish(claim, error_code="INDEX_RETRIES_EXHAUSTED")
            return
        job.status = JobStatus.PENDING.value
        job.claim_token = None
        job.lease_until = datetime.now(UTC) + timedelta(
            seconds=min(60, base_seconds * 2 ** (job.attempt - 1))
        )
        job.error_code = "INDEX_RETRY_PENDING"
        self.session.commit()

    @staticmethod
    def _response(job: IndexJob, request_id: str) -> JobResponse:
        """Project safe fields.

        Args: job, request_id. Returns: response. Raises: invalid metadata.
        """
        return JobResponse(
            request_id=request_id,
            job_id=job.id,
            status=job.status,
            attempt=job.attempt,
            error_code=job.error_code,
            artifact=IndexArtifact.model_validate(job.artifact_metadata)
            if job.artifact_metadata
            else None,
        )
