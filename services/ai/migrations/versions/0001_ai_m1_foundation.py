"""Create AI M1 job and pgvector persistence.

Revision ID: 0001_ai_m1
Revises: None
"""

from collections.abc import Sequence

from alembic import op
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa

revision: str = "0001_ai_m1"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create schema `ai`, pgvector extension and M1 tables/indexes.

    Args:
        None.
    Returns:
        None. Applies forward-only M1 persistence changes transactionally where supported.
    Raises:
        sqlalchemy.exc.SQLAlchemyError: Missing privileges/extension or invalid database state.
    """
    op.execute("CREATE SCHEMA IF NOT EXISTS ai")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "index_jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("request_id", sa.String(length=128), nullable=False),
        sa.Column("idempotency_key", sa.String(length=200), nullable=False),
        sa.Column("operation", sa.String(length=16), nullable=False),
        sa.Column("document_id", sa.String(length=100), nullable=False),
        sa.Column("document_version", sa.Integer(), nullable=False),
        sa.Column("pipeline_type", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=100), nullable=True),
        sa.Column("signed_file_url", sa.Text(), nullable=True),
        sa.Column("mime_type", sa.String(length=160), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="QUEUED"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_ai_job_idempotency"),
        schema="ai",
    )
    op.create_index("ix_ai_job_queue", "index_jobs", ["status", "next_retry_at", "created_at"], schema="ai")

    op.create_table(
        "document_indexes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("document_id", sa.String(length=100), nullable=False),
        sa.Column("document_version", sa.Integer(), nullable=False),
        sa.Column("pipeline_type", sa.String(length=32), nullable=False),
        sa.Column("embedding_model", sa.String(length=160), nullable=False),
        sa.Column("dimensions", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "document_id",
            "document_version",
            "pipeline_type",
            name="uq_ai_document_index_version",
        ),
        schema="ai",
    )

    op.create_table(
        "document_chunks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("document_id", sa.String(length=100), nullable=False),
        sa.Column("document_version", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.String(length=100), nullable=True),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("slide_number", sa.Integer(), nullable=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1024), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "document_id",
            "document_version",
            "chunk_index",
            name="uq_ai_chunk_version_index",
        ),
        schema="ai",
    )
    op.create_index(
        "ix_ai_chunk_scope",
        "document_chunks",
        ["owner_id", "source_type", "document_id", "document_version"],
        schema="ai",
    )
    op.execute(
        "CREATE INDEX ix_ai_chunk_embedding_hnsw ON ai.document_chunks "
        "USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    """Remove only tables/schema created by the initial AI revision.

    Args:
        None.
    Returns:
        None. Removes AI-owned data; pgvector extension remains cluster-wide.
    Raises:
        sqlalchemy.exc.SQLAlchemyError: Database downgrade failure.
    """
    op.drop_index("ix_ai_chunk_embedding_hnsw", table_name="document_chunks", schema="ai")
    op.drop_index("ix_ai_chunk_scope", table_name="document_chunks", schema="ai")
    op.drop_table("document_chunks", schema="ai")
    op.drop_table("document_indexes", schema="ai")
    op.drop_index("ix_ai_job_queue", table_name="index_jobs", schema="ai")
    op.drop_table("index_jobs", schema="ai")
    op.execute("DROP SCHEMA IF EXISTS ai")
