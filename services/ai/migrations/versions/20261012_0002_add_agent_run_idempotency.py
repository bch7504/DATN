"""Add idempotent structured result storage for AI generation runs.

Revision ID: 20261012_0002
Revises: 20261012_0001
Create Date: 2026-10-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261012_0002"
down_revision: str | None = "20261012_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add a unique idempotency key and cached structured result.

    Args:
        None.

    Returns:
        None.

    Raises:
        sqlalchemy.exc.SQLAlchemyError: If PostgreSQL cannot alter the table.
    """

    op.add_column(
        "agent_runs",
        sa.Column("idempotency_key", sa.String(length=255), nullable=True),
        schema="ai",
    )
    op.add_column(
        "agent_runs",
        sa.Column("result_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        schema="ai",
    )
    op.create_unique_constraint(
        "uq_agent_runs_idempotency_key",
        "agent_runs",
        ["idempotency_key"],
        schema="ai",
    )


def downgrade() -> None:
    """Remove idempotent result fields.

    Args:
        None.

    Returns:
        None.

    Raises:
        sqlalchemy.exc.SQLAlchemyError: If PostgreSQL cannot alter the table.
    """

    op.drop_constraint(
        "uq_agent_runs_idempotency_key",
        "agent_runs",
        schema="ai",
        type_="unique",
    )
    op.drop_column("agent_runs", "result_payload", schema="ai")
    op.drop_column("agent_runs", "idempotency_key", schema="ai")
