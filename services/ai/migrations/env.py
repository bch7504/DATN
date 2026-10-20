"""Alembic environment for tables owned by the StudyFlow AI service."""

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import Connection, engine_from_config, inspect, pool

from app.core.database import Base
from app.repositories import models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def ensure_ai_schema(connection: Connection) -> None:
    """Create the AI schema only when infrastructure has not provisioned it.

    Args:
        connection: Active migration connection for the AI database role.

    Returns:
        None. An existing schema is left unchanged.

    Raises:
        sqlalchemy.exc.SQLAlchemyError: If inspection fails or the missing schema
            cannot be created by the configured migration role.
    """

    if not inspect(connection).has_schema("ai"):
        connection.exec_driver_sql("CREATE SCHEMA ai")


def include_ai_name(name: str | None, type_: str, parent_names: dict[str, str | None]) -> bool:
    """Restrict autogeneration to AI tables.

    Args: name: inspected name; type_: Alembic object kind; parent_names: schema metadata.
    Returns: Whether the object belongs to schema ai. Excludes Java-owned tables.
    Raises: None.
    """
    if type_ == "schema":
        return name == "ai"
    return parent_names.get("schema_name") == "ai"


def _database_url() -> str:
    """Read the migration database URL from the process environment.

    Args:
        None.

    Returns:
        The configured AI_DATABASE_URL.

    Raises:
        RuntimeError: If AI_DATABASE_URL is missing.
    """

    value = os.environ.get("AI_DATABASE_URL")
    if value is None or not value.strip():
        raise RuntimeError("AI_DATABASE_URL is required to run migrations")
    return value


def run_migrations_offline() -> None:
    """Generate SQL without opening a database connection.

    Args:
        None.

    Returns:
        None.

    Raises:
        RuntimeError: If AI_DATABASE_URL is missing.
    """

    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        include_name=include_ai_name,
        version_table_schema="ai",
        compare_type=True,
    )
    with context.begin_transaction():
        context.execute("CREATE SCHEMA IF NOT EXISTS ai")
        context.run_migrations()


def run_migrations_online() -> None:
    """Apply migrations using one short-lived database connection.

    Args:
        None.

    Returns:
        None.

    Raises:
        RuntimeError: If AI_DATABASE_URL is missing.
        sqlalchemy.exc.SQLAlchemyError: If connection or migration fails.
    """

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _database_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            include_name=include_ai_name,
            version_table_schema="ai",
            compare_type=True,
        )
        with context.begin_transaction():
            ensure_ai_schema(connection)
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
