"""Prevent concurrent workers activating two pipelines for one document version.

Revision ID: 20261012_0005
Revises: 20261012_0004
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20261012_0005"
down_revision: str = "20261012_0004"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    """Create partial unique index. Args: none. Returns: None. Raises: DB/duplicate-data errors."""
    op.create_index(
        "uq_ai_active_document_version",
        "document_indexes",
        ["document_id", "document_version"],
        unique=True,
        schema="ai",
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )


def downgrade() -> None:
    """Drop unique index. Args: none. Returns: None. Raises: database errors."""
    op.drop_index("uq_ai_active_document_version", table_name="document_indexes", schema="ai")
