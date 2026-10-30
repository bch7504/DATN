"""Offline regressions for lock ordering; not a live PostgreSQL concurrency test."""

from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import build_engine
from app.core.errors import ServiceError
from app.repositories.document_lock import lock_document_version
from app.repositories.job_repository import JobRepository
from app.schemas.jobs import IndexRequest


def test_document_lock_is_stable_versioned_and_transaction_scoped() -> None:
    """Args: none. Returns: None. Raises: AssertionError on incorrect lock scope."""
    session = MagicMock(spec=Session)
    for version in (1, 1, 2):
        lock_document_version(session, document_id=UUID(int=5), version=version)
    queries = [
        call.args[0].compile(dialect=postgresql.dialect())
        for call in session.execute.call_args_list
    ]
    assert all("pg_advisory_xact_lock" in str(query) for query in queries)
    keys = [query.params["document_lock"] for query in queries]
    assert keys[0] == keys[1] and keys[0] != keys[2]
    assert all(-(2**63) <= key < 2**63 for key in keys)
    session.commit.assert_not_called()
    session.rollback.assert_not_called()


def test_invalid_lock_version_does_not_touch_database() -> None:
    """Args: none. Returns: None. Raises: AssertionError if invalid input reaches SQL."""
    session = MagicMock(spec=Session)
    with pytest.raises(ValueError, match="positive"):
        lock_document_version(session, document_id=UUID(int=5), version=0)
    session.execute.assert_not_called()


def test_enqueue_locks_before_reading_revocation_and_cannot_insert_after_revoke() -> None:
    """Args: none. Returns: None. Raises: AssertionError on unsafe operation ordering."""
    session = MagicMock(spec=Session)
    session.scalar.return_value = UUID(int=10)
    payload = IndexRequest(
        document_id=UUID(int=5),
        document_version=1,
        pipeline_version="pdf-v1",
        owner_id=UUID(int=7),
        source_type="PERSONAL_PDF",
        signed_url="https://storage.invalid/synthetic.pdf",
        mime_type="application/pdf",
    )
    with pytest.raises(ServiceError) as caught:
        JobRepository(session).enqueue(
            payload=payload, request_id="synthetic", idempotency_key="revoked-operation"
        )
    assert caught.value.code == "DOCUMENT_REVOKED"
    assert [call[0] for call in session.method_calls] == ["execute", "scalar"]
    assert "pg_advisory_xact_lock" in str(session.execute.call_args.args[0])
    assert "ai.index_jobs" in str(session.scalar.call_args.args[0])
    session.commit.assert_not_called()


def test_engine_requires_fresh_snapshots_after_document_lock() -> None:
    """Args: none. Returns: None. Raises: AssertionError if isolation relies on server defaults."""
    settings = Settings(
        _env_file=None,
        INTERNAL_SERVICE_TOKEN="synthetic-service-token-only",
        AI_DATABASE_URL="postgresql+psycopg://fixture:fixture@db.invalid/fixture",
    )
    with patch("app.core.database.create_engine") as create:
        build_engine(settings)
    assert create.call_args.kwargs["isolation_level"] == "READ COMMITTED"
    assert create.call_args.kwargs["pool_pre_ping"] is True
