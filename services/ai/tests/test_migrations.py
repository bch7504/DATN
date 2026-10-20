"""Offline migration chain checks; never connects to PostgreSQL."""

from io import StringIO
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config


def test_all_migrations_render_only_ai_owned_tables(monkeypatch: pytest.MonkeyPatch) -> None:
    """Compile the full chain and verify vector size, lease columns, and schema isolation."""
    monkeypatch.setenv("AI_DATABASE_URL", "postgresql+psycopg://fake:fake@invalid.test/fake")
    root = Path(__file__).resolve().parents[1]
    output = StringIO()
    config = Config(str(root / "alembic.ini"), output_buffer=output)
    config.set_main_option("script_location", str(root / "migrations"))
    command.upgrade(config, "head", sql=True)
    sql = output.getvalue()
    assert "CREATE TABLE ai.alembic_version" in sql
    assert "VECTOR(1024)" in sql.upper()
    assert "claim_token" in sql
    assert "request_fingerprint" in sql
    assert "uq_ai_active_document_version" in sql
    assert "vector_cosine_ops" in sql
    assert "CREATE TABLE app." not in sql
    assert "ALTER TABLE app." not in sql
