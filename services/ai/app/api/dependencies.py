"""Shared FastAPI dependencies for internal endpoints."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session, sessionmaker

from app.clients.openrouter import OpenRouterClient
from app.core.config import Settings
from app.core.errors import ServiceError
from app.repositories.assistant_run_repository import SqlAlchemyAssistantRunStore
from app.repositories.chunk_repository import PgVectorChunkRepository
from app.repositories.run_repository import SqlAlchemyQuizRunRepository
from app.services.assistant_runs import AssistantRunService
from app.services.grounded_generation import GroundedAnswerService, GroundedQuizService
from app.services.idempotent_quiz import IdempotentQuizGenerationService
from app.services.orchestrator import PersonalAssistantOrchestrator
from app.services.reranking import LangChainEvidenceReranker
from app.services.retrieval import RetrievalService


def get_request_settings(request: Request) -> Settings:
    """Return validated settings attached to the current application.

    Args:
        request: Incoming FastAPI request.

    Returns:
        The immutable Settings instance created during application startup.

    Raises:
        RuntimeError: If the application was created without validated settings.
    """

    settings = getattr(request.app.state, "settings", None)
    if not isinstance(settings, Settings):
        raise RuntimeError("Application settings are unavailable")
    return settings


def get_database_session(request: Request) -> Iterator[Session]:
    """Yield one read transaction for an AI endpoint request.

    Args:
        request: Incoming request whose app owns the session factory.

    Yields:
        One SQLAlchemy session closed after request completion.

    Raises:
        ServiceError: If database configuration is unavailable.
    """

    factory = getattr(request.app.state, "session_factory", None)
    if not isinstance(factory, sessionmaker):
        raise ServiceError(
            status_code=503,
            code="AI_DATABASE_NOT_READY",
            message="AI database is not configured",
        )
    session = factory()
    try:
        yield session
    finally:
        session.close()


def get_openrouter_client(request: Request) -> OpenRouterClient:
    """Return the application-owned model-provider adapter.

    Args:
        request: Incoming request whose app owns provider resources.

    Returns:
        Configured OpenRouter adapter.

    Raises:
        ServiceError: If provider configuration is unavailable.
    """

    provider = getattr(request.app.state, "openrouter_client", None)
    if not isinstance(provider, OpenRouterClient):
        raise ServiceError(
            status_code=503,
            code="AI_PROVIDER_NOT_READY",
            message="AI model provider is not configured",
        )
    return provider


def get_retrieval_service(
    session: Annotated[Session, Depends(get_database_session)],
    provider: Annotated[OpenRouterClient, Depends(get_openrouter_client)],
    settings: Annotated[Settings, Depends(get_request_settings)],
) -> RetrievalService:
    """Build one request-scoped authorized retrieval service.

    Args:
        session: Request-owned AI database session.
        provider: Application-owned embedding provider.
        settings: Validated runtime settings.

    Returns:
        Retrieval service using pgvector and fixed embedding dimensions.

    Raises:
        None.
    """

    return RetrievalService(
        embedding_client=provider,
        chunk_repository=PgVectorChunkRepository(
            session,
            embedding_dimensions=settings.embedding_dimensions,
            embedding_model=settings.openrouter_embedding_model,
            minimum_relevance=settings.retrieval_minimum_relevance,
            rrf_k=settings.retrieval_rrf_k,
        ),
        embedding_dimensions=settings.embedding_dimensions,
        minimum_relevance=settings.retrieval_minimum_relevance,
        candidate_limit=settings.retrieval_candidate_limit,
        reranker=LangChainEvidenceReranker(diversity_penalty=settings.rerank_diversity_penalty),
    )


def get_grounded_answer_service(
    retrieval: Annotated[RetrievalService, Depends(get_retrieval_service)],
    provider: Annotated[OpenRouterClient, Depends(get_openrouter_client)],
) -> GroundedAnswerService:
    """Build the grounded answer and summary tool.

    Args:
        retrieval: Request-scoped authorized retrieval service.
        provider: Structured generation provider.

    Returns:
        Grounded answer service.

    Raises:
        None.
    """

    return GroundedAnswerService(retrieval_service=retrieval, generation_client=provider)


def get_grounded_quiz_service(
    retrieval: Annotated[RetrievalService, Depends(get_retrieval_service)],
    provider: Annotated[OpenRouterClient, Depends(get_openrouter_client)],
) -> GroundedQuizService:
    """Build the grounded MCQ_SINGLE draft generator.

    Args:
        retrieval: Request-scoped authorized retrieval service.
        provider: Structured generation provider.

    Returns:
        Grounded Quiz service.

    Raises:
        None.
    """

    return GroundedQuizService(retrieval_service=retrieval, generation_client=provider)


def get_personal_assistant_orchestrator(
    answer_service: Annotated[GroundedAnswerService, Depends(get_grounded_answer_service)],
    quiz_service: Annotated[GroundedQuizService, Depends(get_grounded_quiz_service)],
    provider: Annotated[OpenRouterClient, Depends(get_openrouter_client)],
) -> PersonalAssistantOrchestrator:
    """Build one constrained Personal Document orchestrator.

    Args:
        answer_service: Registered grounded ask/summary tool.
        quiz_service: Registered grounded Quiz tool.
        provider: Structured intent classifier.

    Returns:
        Single-agent orchestrator exposing only three allowed operations.

    Raises:
        None.
    """

    return PersonalAssistantOrchestrator(
        intent_client=provider,
        answer_service=answer_service,
        quiz_service=quiz_service,
    )


def get_idempotent_quiz_service(
    session: Annotated[Session, Depends(get_database_session)],
    quiz_service: Annotated[GroundedQuizService, Depends(get_grounded_quiz_service)],
) -> IdempotentQuizGenerationService:
    """Build a Quiz generator protected by durable idempotency.

    Args:
        session: Request-owned AI database session.
        quiz_service: Grounded MCQ_SINGLE generation service.

    Returns:
        Idempotent Quiz generation service.

    Raises:
        None.
    """

    return IdempotentQuizGenerationService(
        run_repository=SqlAlchemyQuizRunRepository(session),
        quiz_service=quiz_service,
    )


def get_assistant_run_service(
    session: Annotated[Session, Depends(get_database_session)],
    orchestrator: Annotated[
        PersonalAssistantOrchestrator, Depends(get_personal_assistant_orchestrator)
    ],
) -> AssistantRunService:
    """Args: AI DB session, orchestrator. Returns: replay-safe assistant. Raises: none."""
    return AssistantRunService(store=SqlAlchemyAssistantRunStore(session), executor=orchestrator)
