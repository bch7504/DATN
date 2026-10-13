"""Bind idempotent runs to input and authorized scope.

Revision ID: 20261012_0003
Revises: 20261012_0002
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20261012_0003"
down_revision: str = "20261012_0002"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    """Add fingerprint. Args: none. Returns: None. Raises: database errors."""
    op.add_column("agent_runs", sa.Column("request_fingerprint", sa.String(64)), schema="ai")


def downgrade() -> None:
    """Remove fingerprint. Args: none. Returns: None. Raises: database errors."""
    op.drop_column("agent_runs", "request_fingerprint", schema="ai")
