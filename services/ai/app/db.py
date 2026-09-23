"""SQLAlchemy session boundary for the Python-owned `ai` schema."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base for Python-owned database models."""


engine = create_engine(settings.ai_database_url, pool_pre_ping=True)
SessionFactory = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)


def get_session() -> Generator[Session, None, None]:
    """Yield a transactional SQLAlchemy session to one request.

    Args:
        None.
    Yields:
        Session: Database session scoped to the current request.
    Raises:
        sqlalchemy.exc.SQLAlchemyError: Caller maps unavailable persistence to a safe 503.
    """
    with SessionFactory() as session:
        yield session
