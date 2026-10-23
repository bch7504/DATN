"""Locked Vietnamese validation dataset and live Hybrid RAG evaluation runner."""

import os
from pathlib import Path
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.clients.openrouter import OpenRouterClient
from app.core.config import Settings
from app.core.database import build_engine, build_session_factory
from app.repositories.chunk_repository import PgVectorChunkRepository
from app.repositories.models import SourceType
from app.schemas.grounding import AnswerStatus, AuthorizedDocument, AuthorizedScope
from app.services.grounded_generation import GroundedAnswerService
from app.services.reranking import LangChainEvidenceReranker
from app.services.retrieval import RetrievalService
from evals.metrics import EvaluationCase, EvaluationReport, PageReference, evaluate

DEFAULT_DATASET = Path(__file__).parent / "datasets" / "ky-thuat-so-v1.json"
EVALUATION_ACTOR_ID = UUID("11111111-1111-4111-8111-111111111111")


def _camel(name: str) -> str:
    """Convert one snake_case field name to lower camel case.

    Args:
        name: Python field name.

    Returns:
        JSON alias used by the locked dataset.

    Raises:
        None.
    """

    head, *tail = name.split("_")
    return head + "".join(part.title() for part in tail)


class ValidationQuestion(BaseModel):
    """One independently labeled Vietnamese question."""

    model_config = ConfigDict(extra="forbid", alias_generator=lambda name: _camel(name))
    case_id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    document_id: UUID
    document_version: int = Field(ge=1)
    answerable: bool
    expected_pages: tuple[int, ...]


class ValidationDataset(BaseModel):
    """Versioned Vietnamese validation dataset."""

    model_config = ConfigDict(extra="forbid", alias_generator=lambda name: _camel(name))
    dataset_id: str = Field(min_length=1)
    language: str = Field(pattern="^vi$")
    description: str = Field(min_length=1)
    cases: tuple[ValidationQuestion, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_labels(self) -> "ValidationDataset":
        """Validate unique IDs and agreement between answerability and page labels.

        Args:
            None. Pydantic supplies the validated model instance.

        Returns:
            This validated dataset.

        Raises:
            ValueError: If identifiers repeat or page labels are inconsistent.
        """

        case_ids = [case.case_id for case in self.cases]
        if len(case_ids) != len(set(case_ids)):
            raise ValueError("validation case IDs must be unique")
        for case in self.cases:
            if case.answerable != bool(case.expected_pages):
                raise ValueError("answerable cases require pages; unanswerable cases require none")
            if any(page < 1 for page in case.expected_pages):
                raise ValueError("expected pages must be positive")
        return self


class LiveEvaluationResult(BaseModel):
    """Machine-checkable report; factual groundedness remains a human review field."""

    dataset_id: str
    model: str
    embedding_model: str
    report: EvaluationReport
    human_review_required: bool = True


def load_dataset(path: Path = DEFAULT_DATASET) -> ValidationDataset:
    """Load and validate a locked Vietnamese evaluation dataset.

    Args:
        path: JSON file containing labeled questions and expected pages.

    Returns:
        Strictly validated dataset.

    Raises:
        OSError: If the dataset cannot be read.
        pydantic.ValidationError: If its schema is invalid.
        ValueError: If labels are inconsistent or case IDs are duplicated.
    """

    return ValidationDataset.model_validate_json(path.read_text(encoding="utf-8"))


async def run_live_evaluation(
    *, dataset_path: Path = DEFAULT_DATASET, retrieval_limit: int = 8
) -> LiveEvaluationResult:
    """Run real OpenRouter + PostgreSQL Hybrid RAG evaluation.

    Args:
        dataset_path: Locked Vietnamese JSON dataset.
        retrieval_limit: Maximum retrieved chunks per question, from 1 to 50.

    Returns:
        Retrieval, citation-location, and NO_EVIDENCE metrics. Human factual
        groundedness intentionally remains unset until an independent reviewer scores it.

    Raises:
        ValueError: If process configuration, dataset, or limit is invalid.
        RuntimeError: If PostgreSQL or OpenRouter fails.
    """

    if not 1 <= retrieval_limit <= 50:
        raise ValueError("retrieval_limit must be between 1 and 50")
    if not os.environ.get("AI_DATABASE_URL", "").strip():
        raise ValueError("AI_DATABASE_URL must be injected into the evaluation process")
    if not os.environ.get("OPENROUTER_API_KEY", "").strip():
        raise ValueError("OPENROUTER_API_KEY must be injected into the evaluation process")

    settings = Settings(
        INTERNAL_SERVICE_TOKEN="live-evaluation-only-token",
    )
    dataset = load_dataset(dataset_path)
    provider = OpenRouterClient.from_settings(settings)
    engine = build_engine(settings)
    factory = build_session_factory(engine)
    observations: list[EvaluationCase] = []
    try:
        with factory() as session:
            repository = PgVectorChunkRepository(
                session,
                embedding_dimensions=settings.embedding_dimensions,
                embedding_model=settings.openrouter_embedding_model,
                minimum_relevance=settings.retrieval_minimum_relevance,
                rrf_k=settings.retrieval_rrf_k,
            )
            retrieval = RetrievalService(
                embedding_client=provider,
                chunk_repository=repository,
                embedding_dimensions=settings.embedding_dimensions,
                minimum_relevance=settings.retrieval_minimum_relevance,
                candidate_limit=settings.retrieval_candidate_limit,
                reranker=LangChainEvidenceReranker(
                    diversity_penalty=settings.rerank_diversity_penalty
                ),
            )
            answer_service = GroundedAnswerService(
                retrieval_service=retrieval,
                generation_client=provider,
            )
            for case in dataset.cases:
                document = AuthorizedDocument(
                    document_id=case.document_id,
                    document_version=case.document_version,
                    source_type=SourceType.COURSE_MATERIAL_PDF,
                )
                scope = AuthorizedScope(actor_id=EVALUATION_ACTOR_ID, documents=(document,))
                evidence = await retrieval.retrieve(
                    query=case.question,
                    scope=scope,
                    limit=retrieval_limit,
                )
                result = await answer_service.answer(
                    instruction=case.question,
                    scope=scope,
                    retrieval_limit=retrieval_limit,
                )
                observations.append(
                    EvaluationCase(
                        case_id=case.case_id,
                        category="VIETNAMESE_COURSE_RAG",
                        answerable=case.answerable,
                        expected_pages=tuple(
                            PageReference(
                                document_id=str(case.document_id),
                                version=case.document_version,
                                page=page,
                            )
                            for page in case.expected_pages
                        ),
                        retrieved_pages=tuple(
                            PageReference(
                                document_id=str(item.document_id),
                                version=item.document_version,
                                page=item.page_number,
                            )
                            for item in evidence
                        ),
                        cited_pages=tuple(
                            PageReference(
                                document_id=str(item.document_id),
                                version=item.document_version,
                                page=item.page_number,
                            )
                            for item in result.citations
                        ),
                        abstained=result.status is AnswerStatus.NO_EVIDENCE,
                    )
                )
    finally:
        await provider.close()
        engine.dispose()

    return LiveEvaluationResult(
        dataset_id=dataset.dataset_id,
        model=settings.openrouter_chat_model,
        embedding_model=settings.openrouter_embedding_model,
        report=evaluate(tuple(observations), k=retrieval_limit),
    )
