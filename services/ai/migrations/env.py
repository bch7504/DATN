"""Alembic environment for the Python-owned `ai` schema."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db import Base
from app import models  # noqa: F401  # Registers metadata for autogenerate.

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
config.set_main_option("sqlalchemy.url", settings.ai_database_url.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Generate SQL without opening a database connection.

    Args:
        None. Uses validated process settings and SQLAlchemy metadata.
    Returns:
        None. Emits migration SQL through Alembic's configured output.
    Raises:
        alembic.util.exc.CommandError: Invalid migration configuration.
    """
    context.configure(
        url=settings.ai_database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema="ai",
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using one transactional database connection.

    Args:
        None. Uses the Alembic configuration and AI database URL.
    Returns:
        None. Applies pending revisions to schema `ai`.
    Raises:
        sqlalchemy.exc.SQLAlchemyError: Database connection/migration failure.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            version_table_schema="ai",
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
