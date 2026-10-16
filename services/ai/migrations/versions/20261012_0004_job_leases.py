"""Add reclaimable document job leases.

Revision ID: 20261012_0004
Revises: 20261012_0003
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "20261012_0004"
down_revision: str = "20261012_0003"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    """Add lease fields. Args: none. Returns: None. Raises: database errors."""
    op.add_column("index_jobs", sa.Column("claim_token", UUID(as_uuid=True)), schema="ai")
    op.add_column("index_jobs", sa.Column("lease_until", sa.DateTime(timezone=True)), schema="ai")


def downgrade() -> None:
    """Remove lease fields. Args: none. Returns: None. Raises: database errors."""
    op.drop_column("index_jobs", "lease_until", schema="ai")
    op.drop_column("index_jobs", "claim_token", schema="ai")
