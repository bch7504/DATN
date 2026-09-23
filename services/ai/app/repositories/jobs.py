"""Durable idempotent job persistence for index/deindex requests."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ServiceError
from app.models import IndexJobModel


class JobRepository:
    """Persist and claim Python-owned background jobs."""

    def __init__(self, session: Session) -> None:
        """Create a repository scoped to one SQLAlchemy session.

        Args:
            session: Session connected with the Python database role/schema access.
        Returns:
            None. Stores the transactional session.
        Raises:
            None.
        """
        self._session = session

    def enqueue(
        self,
        *,
        request_id: str,
        idempotency_key: str,
        operation: str,
        document_id: str,
        document_version: int,
        pipeline_type: str,
        owner_id: str | None = None,
        signed_file_url: str | None = None,
        mime_type: str | None = None,
    ) -> IndexJobModel:
        """Insert one job or return the existing equivalent idempotent job.

        Args:
            request_id: Cross-service trace ID from Java.
            idempotency_key: Globally unique mutation key supplied by Java.
            operation: `INDEX` or `DEINDEX`.
            document_id: Authorized Java document identifier.
            document_version: Positive immutable document version.
            pipeline_type: `PERSONAL_RAG` or `TEACHER_SLIDE`.
            owner_id: Personal document owner, otherwise optional.
            signed_file_url: Short-lived worker input URL for INDEX only.
            mime_type: Validated source MIME for INDEX only.
        Returns:
            IndexJobModel: New or previously persisted equivalent job.
        Raises:
            ServiceError: `IDEMPOTENCY_CONFLICT` if a key is reused for another mutation.
            sqlalchemy.exc.SQLAlchemyError: Persistence failure for caller error mapping.
        """
        existing = self._by_key(idempotency_key)
        if existing is not None:
            self._ensure_equivalent(
                existing,
                operation,
                document_id,
                document_version,
                pipeline_type,
                owner_id,
                mime_type,
            )
            return existing

        job = IndexJobModel(
            request_id=request_id,
            idempotency_key=idempotency_key,
            operation=operation,
            document_id=document_id,
            document_version=document_version,
            pipeline_type=pipeline_type,
            owner_id=owner_id,
            signed_file_url=signed_file_url,
            mime_type=mime_type,
        )
        self._session.add(job)
        try:
            self._session.commit()
        except IntegrityError:
            self._session.rollback()
            existing = self._by_key(idempotency_key)
            if existing is None:
                raise
            self._ensure_equivalent(
                existing,
                operation,
                document_id,
                document_version,
                pipeline_type,
                owner_id,
                mime_type,
            )
            return existing
        self._session.refresh(job)
        return job

    def get(self, job_id: str) -> IndexJobModel | None:
        """Load one job without exposing signed input data.

        Args:
            job_id: UUID returned when the mutation was accepted.
        Returns:
            IndexJobModel | None: Matching job or None.
        Raises:
            sqlalchemy.exc.SQLAlchemyError: Database read failure.
        """
        return self._session.get(IndexJobModel, job_id)

    def claim_next(self) -> IndexJobModel | None:
        """Atomically claim the oldest due job using `SKIP LOCKED`.

        Args:
            None.
        Returns:
            IndexJobModel | None: Claimed RUNNING job or None when queue is empty.
        Raises:
            sqlalchemy.exc.SQLAlchemyError: Transaction failure; no job is claimed.
        """
        now = datetime.now(UTC)
        statement = (
            select(IndexJobModel)
            .where(
                IndexJobModel.status == "QUEUED",
                or_(IndexJobModel.next_retry_at.is_(None), IndexJobModel.next_retry_at <= now),
            )
            .order_by(IndexJobModel.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        job = self._session.execute(statement).scalar_one_or_none()
        if job is None:
            return None
        job.status = "RUNNING"
        job.attempts += 1
        job.next_retry_at = None
        self._session.commit()
        self._session.refresh(job)
        return job

    def mark_succeeded(self, job_id: str) -> None:
        """Complete a claimed job and remove its signed URL.

        Args:
            job_id: Claimed job UUID.
        Returns:
            None. Persists SUCCEEDED and clears transient input/error metadata.
        Raises:
            ServiceError: `JOB_NOT_FOUND` when the claimed row disappeared.
        """
        job = self._require(job_id)
        job.status = "SUCCEEDED"
        job.signed_file_url = None
        job.error_code = None
        job.next_retry_at = None
        self._session.commit()

    def mark_failed(
        self,
        job_id: str,
        error_code: str,
        *,
        retryable: bool,
        max_attempts: int,
        retry_base_seconds: int,
    ) -> None:
        """Schedule bounded retry or finish a job with a safe error code.

        Args:
            job_id: Claimed job UUID.
            error_code: Stable non-sensitive worker error code.
            retryable: Whether the processor classified the failure as transient.
            max_attempts: Maximum total claim attempts.
            retry_base_seconds: Base for exponential retry delay.
        Returns:
            None. Persists QUEUED with next retry or terminal FAILED.
        Raises:
            ServiceError: `JOB_NOT_FOUND` when the claimed row disappeared.
        """
        job = self._require(job_id)
        should_retry = retryable and job.attempts < max_attempts
        job.status = "QUEUED" if should_retry else "FAILED"
        job.error_code = error_code
        job.next_retry_at = (
            datetime.now(UTC) + timedelta(seconds=retry_base_seconds * (2 ** max(job.attempts - 1, 0)))
            if should_retry
            else None
        )
        if not should_retry:
            job.signed_file_url = None
        self._session.commit()

    def _by_key(self, idempotency_key: str) -> IndexJobModel | None:
        """Find one job by its globally unique idempotency key.

        Args:
            idempotency_key: Mutation key supplied by Java.
        Returns:
            IndexJobModel | None: Existing row or None.
        Raises:
            sqlalchemy.exc.SQLAlchemyError: Database read failure.
        """
        statement = select(IndexJobModel).where(IndexJobModel.idempotency_key == idempotency_key)
        return self._session.execute(statement).scalar_one_or_none()

    def _require(self, job_id: str) -> IndexJobModel:
        """Require a job row before a worker status mutation.

        Args:
            job_id: Claimed job UUID.
        Returns:
            IndexJobModel: Matching row.
        Raises:
            ServiceError: `JOB_NOT_FOUND` when absent.
        """
        job = self.get(job_id)
        if job is None:
            raise ServiceError("JOB_NOT_FOUND", "Background job was not found", 404)
        return job

    @staticmethod
    def _ensure_equivalent(
        existing: IndexJobModel,
        operation: str,
        document_id: str,
        document_version: int,
        pipeline_type: str,
        owner_id: str | None,
        mime_type: str | None,
    ) -> None:
        """Reject reuse of one idempotency key for a different mutation identity.

        Args:
            existing: Previously stored job.
            operation: Requested INDEX/DEINDEX operation.
            document_id: Requested document identifier.
            document_version: Requested immutable version.
            pipeline_type: Requested pipeline.
            owner_id: Requested Personal owner or None.
            mime_type: Requested INDEX MIME or None.
        Returns:
            None when both mutation identities match.
        Raises:
            ServiceError: `IDEMPOTENCY_CONFLICT` when any identity field differs.
        """
        identity = (
            existing.operation,
            existing.document_id,
            existing.document_version,
            existing.pipeline_type,
            existing.owner_id,
            existing.mime_type,
        )
        requested = (operation, document_id, document_version, pipeline_type, owner_id, mime_type)
        if identity != requested:
            raise ServiceError(
                "IDEMPOTENCY_CONFLICT",
                "Idempotency key was already used for another mutation",
                409,
            )
