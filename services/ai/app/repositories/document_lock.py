"""Transaction-scoped serialization for document mutations, including missing rows."""

import hashlib
from uuid import UUID

from sqlalchemy import BigInteger, bindparam, func, select
from sqlalchemy.orm import Session


def lock_document_version(session: Session, *, document_id: UUID, version: int) -> None:
    """Serialize all pipelines of a document version before acquiring row locks.

    Args:
        session: AI-owned session using PostgreSQL READ COMMITTED isolation.
        document_id: Required immutable document UUID issued by Java.
        version: Required positive document version.
    Returns:
        None. Holds a transaction advisory lock until caller commit/rollback.
        Does not open another transaction, commit, or access business tables.
    Raises:
        ValueError: If version is not positive.
        sqlalchemy.exc.SQLAlchemyError: On lock/connection failure; caller rolls back.
    """
    if version < 1:
        raise ValueError("document version must be positive")
    digest = hashlib.sha256(f"studyflow:ai:document:{document_id}:{version}".encode()).digest()
    lock_key = int.from_bytes(digest[:8], byteorder="big", signed=True)
    session.execute(
        select(func.pg_advisory_xact_lock(bindparam("document_lock", lock_key, type_=BigInteger)))
    )
