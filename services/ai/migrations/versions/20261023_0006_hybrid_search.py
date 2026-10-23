"""Add PostgreSQL full-text search support for hybrid RAG retrieval.

Revision ID: 20261023_0006
Revises: 20261012_0005
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261023_0006"
down_revision: str = "20261012_0005"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    """Add a generated multilingual token vector and GIN index.

    Args:
        None.

    Returns:
        None.

    Raises:
        sqlalchemy.exc.SQLAlchemyError: If PostgreSQL cannot alter or index the table.
    """

    op.add_column(
        "document_chunks",
        sa.Column(
            "search_vector",
            postgresql.TSVECTOR(),
            sa.Computed("to_tsvector('simple', coalesce(content, ''))", persisted=True),
            nullable=False,
        ),
        schema="ai",
    )
    op.create_index(
        "ix_ai_document_chunks_search_vector_gin",
        "document_chunks",
        ["search_vector"],
        schema="ai",
        postgresql_using="gin",
    )


def downgrade() -> None:
    """Remove hybrid-search storage.

    Args:
        None.

    Returns:
        None.

    Raises:
        sqlalchemy.exc.SQLAlchemyError: If PostgreSQL cannot drop the index or column.
    """

    op.drop_index(
        "ix_ai_document_chunks_search_vector_gin",
        table_name="document_chunks",
        schema="ai",
    )
    op.drop_column("document_chunks", "search_vector", schema="ai")
