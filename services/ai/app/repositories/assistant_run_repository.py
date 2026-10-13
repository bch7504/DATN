"""Durable request-id replay for Personal Assistant runs."""

from typing import Protocol
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.repositories.models import AgentRun, AgentRunStatus
from app.repositories.run_repository import RunConflictError
from app.schemas.orchestration import AssistantRunResult
from app.schemas.runs import RunReservationStatus


class AssistantReservation(BaseModel):
    """Typed result of reserving a Personal Assistant request."""

    model_config = ConfigDict(frozen=True)
    run_id: UUID
    status: RunReservationStatus
    cached_result: AssistantRunResult | None = None


class AssistantRunStore(Protocol):
    """Narrow storage boundary used by the request replay wrapper."""

    def reserve(
        self,
        *,
        request_id: str,
        key: str,
        actor_id: UUID,
        conversation_id: UUID | None,
        fingerprint: str,
    ) -> AssistantReservation:
        """Reserve a request. Args: trace, namespaced key, actor, conversation, input digest.

        Returns: A new reservation or prior result; commits reservation.
        Raises: RunConflictError for mismatches; RuntimeError for failed previous runs; DB errors.
        """

    def complete(self, *, run_id: UUID, result: AssistantRunResult) -> None:
        """Persist validated output. Args: run_id, result. Returns: None. Raises: DB errors."""

    def fail(self, *, run_id: UUID) -> None:
        """Record safe failure. Args: run_id. Returns: None. Raises: DB errors."""


class SqlAlchemyAssistantRunStore:
    """Persist only AI run data, never Quiz lifecycle or business state."""

    def __init__(self, session: Session) -> None:
        """Bind session. Args: AI-owned session. Returns: None. Raises: none."""
        self._session = session

    def reserve(
        self,
        *,
        request_id: str,
        key: str,
        actor_id: UUID,
        conversation_id: UUID | None,
        fingerprint: str,
    ) -> AssistantReservation:
        """Atomically reserve or replay a request bound to its authorized scope.

        Args: request_id: trace; key: stable namespaced key; actor_id: Student;
            conversation_id: optional Java conversation; fingerprint: canonical input digest.
        Returns: Committed reservation or cached structured response.
        Raises: RunConflictError if input changed; RuntimeError on prior failure; DB errors.
        """
        inserted = self._session.scalar(
            insert(AgentRun)
            .values(
                request_id=request_id,
                idempotency_key=key,
                actor_id=actor_id,
                conversation_id=conversation_id,
                request_fingerprint=fingerprint,
                selected_tool="PERSONAL_ASSISTANT",
                status=AgentRunStatus.RUNNING.value,
            )
            .on_conflict_do_nothing(index_elements=[AgentRun.idempotency_key])
            .returning(AgentRun.id)
        )
        self._session.commit()
        if inserted is not None:
            return AssistantReservation(run_id=inserted, status=RunReservationStatus.RESERVED)
        run = self._session.scalar(select(AgentRun).where(AgentRun.idempotency_key == key))
        if run is None:
            raise RuntimeError("Assistant run disappeared")
        if (
            run.actor_id != actor_id
            or run.request_fingerprint != fingerprint
            or run.conversation_id != conversation_id
        ):
            raise RunConflictError("Request identity was reused for another authorized payload")
        if run.status == AgentRunStatus.SUCCEEDED.value:
            return AssistantReservation(
                run_id=run.id,
                status=RunReservationStatus.COMPLETED,
                cached_result=AssistantRunResult.model_validate(run.result_payload),
            )
        if run.status == AgentRunStatus.RUNNING.value:
            return AssistantReservation(run_id=run.id, status=RunReservationStatus.IN_PROGRESS)
        raise RuntimeError("Previous assistant run failed; a new request identity is required")

    def complete(self, *, run_id: UUID, result: AssistantRunResult) -> None:
        """Save a replayable structured response.

        Args: run_id: reserved run; result: validated tool output.
        Returns: None; commits output and selected tool.
        Raises: RuntimeError if reservation is no longer running; DB errors.
        """
        changed = self._session.execute(
            update(AgentRun)
            .where(
                AgentRun.id == run_id,
                AgentRun.status == AgentRunStatus.RUNNING.value,
            )
            .values(
                status=AgentRunStatus.SUCCEEDED.value,
                selected_tool=result.selected_tool.value,
                result_payload=result.model_dump(mode="json"),
            )
        )
        if changed.rowcount != 1:
            self._session.rollback()
            raise RuntimeError("Assistant reservation is no longer running")
        self._session.commit()

    def fail(self, *, run_id: UUID) -> None:
        """Args: run_id. Returns: None; rolls back pending writes, records safe failure.

        Raises: SQLAlchemyError on unavailable persistence.
        """
        self._session.rollback()
        self._session.execute(
            update(AgentRun)
            .where(
                AgentRun.id == run_id,
                AgentRun.status == AgentRunStatus.RUNNING.value,
            )
            .values(status=AgentRunStatus.FAILED.value, error_code="ASSISTANT_RUN_FAILED")
        )
        self._session.commit()
