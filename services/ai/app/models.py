"""Python-owned persistence models for jobs, index versions and chunks."""

from datetime import datetime
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _uuid() -> str:
    """Generate a portable UUID string.

    Args:
        None.
    Returns:
        str: Random UUID4 string.
    Raises:
        None.
    """
    return str(uuid4())


class IndexJobModel(Base):
    """Idempotent INDEX/DEINDEX work accepted from Java."""

    __tablename__ = "index_jobs"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_ai_job_idempotency"),
        Index("ix_ai_job_queue", "status", "next_retry_at", "created_at"),
        {"schema": "ai"},
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    request_id: Mapped[str] = mapped_column(String(128), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False)
    operation: Mapped[str] = mapped_column(String(16), nullable=False)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False)
    document_version: Mapped[int] = mapped_column(Integer, nullable=False)
    pipeline_type: Mapped[str] = mapped_column(String(32), nullable=False)
    owner_id: Mapped[str | None] = mapped_column(String(100))
    signed_file_url: Mapped[str | None] = mapped_column(Text)
    mime_type: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="QUEUED")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DocumentIndexModel(Base):
    """Versioned embedding configuration for one indexed document."""

    __tablename__ = "document_indexes"
    __table_args__ = (
        UniqueConstraint("document_id", "document_version", "pipeline_type", name="uq_ai_document_index_version"),
        {"schema": "ai"},
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False)
    document_version: Mapped[int] = mapped_column(Integer, nullable=False)
    pipeline_type: Mapped[str] = mapped_column(String(32), nullable=False)
    embedding_model: Mapped[str] = mapped_column(String(160), nullable=False)
    dimensions: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DocumentChunkModel(Base):
    """Page/slide chunk and its 1024-dimensional embedding."""

    __tablename__ = "document_chunks"
    __table_args__ = (
        UniqueConstraint("document_id", "document_version", "chunk_index", name="uq_ai_chunk_version_index"),
        Index("ix_ai_chunk_scope", "owner_id", "source_type", "document_id", "document_version"),
        {"schema": "ai"},
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False)
    document_version: Mapped[int] = mapped_column(Integer, nullable=False)
    owner_id: Mapped[str | None] = mapped_column(String(100))
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer)
    slide_number: Mapped[int | None] = mapped_column(Integer)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1024), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
