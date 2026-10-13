"""SQLAlchemy engine and session construction for the isolated ai schema."""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import MetaData, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import Settings

NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base class for tables owned exclusively by the Python AI service."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def build_engine(settings: Settings) -> Engine:
    """Create a PostgreSQL engine without opening a connection immediately.

    Args:
        settings: Validated settings containing AI_DATABASE_URL.

    Returns:
        A SQLAlchemy Engine with health checks and READ COMMITTED isolation;
        document advisory locks require fresh statement snapshots after waiting.

    Raises:
        ValueError: If AI_DATABASE_URL is not configured.
        sqlalchemy.exc.ArgumentError: If the configured URL is invalid.
    """

    if settings.ai_database_url is None:
        raise ValueError("AI_DATABASE_URL is required for database access")
    return create_engine(
        settings.ai_database_url.get_secret_value(),
        pool_pre_ping=True,
        isolation_level="READ COMMITTED",
        future=True,
    )


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    """Create a typed session factory bound to one AI database engine.

    Args:
        engine: SQLAlchemy engine for the shared PostgreSQL cluster.

    Returns:
        A sessionmaker that creates non-expiring Session objects.

    Raises:
        None.
    """

    return sessionmaker(bind=engine, expire_on_commit=False, class_=Session)


@contextmanager
def session_scope(factory: sessionmaker[Session]) -> Iterator[Session]:
    """Yield one transaction-scoped session and commit it on success.

    Args:
        factory: Session factory returned by build_session_factory.

    Yields:
        One SQLAlchemy Session.

    Raises:
        Exception: Re-raises database or application errors after rolling back.
    """

    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
