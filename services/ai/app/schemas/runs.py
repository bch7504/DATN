"""Internal values for idempotent AI run reservation."""

from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.grounding import QuizDraft


class RunReservationStatus(StrEnum):
    """Possible outcomes when reserving an idempotency key."""

    RESERVED = "RESERVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class QuizRunReservation(BaseModel):
    """Result of atomically reserving one Quiz generation key."""

    model_config = ConfigDict(frozen=True)

    run_id: UUID
    status: RunReservationStatus
    cached_quiz: QuizDraft | None = None
