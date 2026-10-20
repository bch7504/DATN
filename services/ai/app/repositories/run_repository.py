"""Idempotent AI run persistence for synchronous Quiz generation."""

from typing import Protocol
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.repositories.models import AgentRun, AgentRunStatus
from app.schemas.grounding import QuizDraft
from app.schemas.runs import QuizRunReservation, RunReservationStatus


class RunConflictError(ValueError):
    """A stable run key was reused with a different actor or authorized payload."""


class QuizRunRepository(Protocol):
    """Contract for reserving and completing idempotent Quiz runs."""

    def reserve(
        self,
        *,
        request_id: str,
        idempotency_key: str,
        actor_id: UUID,
        request_fingerprint: str,
    ) -> QuizRunReservation:
        """Atomically reserve a key or return its current safe result.

        Args:
            request_id: Cross-service trace identifier.
            idempotency_key: Java-provided stable operation key.
            actor_id: Authorized Student or Teacher identifier.
            request_fingerprint: SHA-256 of normalized input and authorized scope.

        Returns:
            RESERVED, IN_PROGRESS, or COMPLETED with cached Quiz.

        Raises:
            ValueError: If input is invalid or stored result is malformed.
            sqlalchemy.exc.SQLAlchemyError: If persistence fails.
        """

    def succeed(self, *, run_id: UUID, quiz: QuizDraft) -> None:
        """Persist one successful structured Quiz result.

        Args:
            run_id: Reserved run identifier.
            quiz: Validated grounded Quiz draft.

        Returns:
            None.

        Raises:
            RuntimeError: If the run is not currently RUNNING.
            sqlalchemy.exc.SQLAlchemyError: If persistence fails.
        """

    def fail(self, *, run_id: UUID, error_code: str) -> None:
        """Mark one running request failed using only a safe error code.

        Args:
            run_id: Reserved run identifier.
            error_code: Safe stable code without provider or document content.

        Returns:
            None.

        Raises:
            sqlalchemy.exc.SQLAlchemyError: If persistence fails.
        """


class SqlAlchemyQuizRunRepository:
    """PostgreSQL implementation using ON CONFLICT for reservation."""

    def __init__(self, session: Session) -> None:
        """Bind the repository to one request-owned session.

        Args:
            session: SQLAlchemy session connected as the AI database role.

        Returns:
            None.

        Raises:
            None.
        """

        self._session = session

    def reserve(
        self,
        *,
        request_id: str,
        idempotency_key: str,
        actor_id: UUID,
        request_fingerprint: str,
    ) -> QuizRunReservation:
        """Reserve a key, replay success, or report concurrent execution.

        Args:
            request_id: Cross-service trace identifier.
            idempotency_key: Stable non-blank key supplied by Java.
            actor_id: Authorized caller identifier.
            request_fingerprint: Hash binding the key to input and scope.

        Returns:
            Reservation status and cached Quiz when already completed.

        Raises:
            ValueError: If input is blank, actor differs, or cached JSON is invalid.
            sqlalchemy.exc.SQLAlchemyError: If PostgreSQL operations fail.
        """

        if not request_id.strip() or not idempotency_key.strip():
            raise ValueError("request_id and idempotency_key must not be blank")
        inserted_id = self._session.scalar(
            insert(AgentRun)
            .values(
                request_id=request_id,
                idempotency_key=idempotency_key,
                actor_id=actor_id,
                request_fingerprint=request_fingerprint,
                selected_tool="GENERATE_QUIZ",
                status=AgentRunStatus.RUNNING.value,
            )
            .on_conflict_do_nothing(index_elements=[AgentRun.idempotency_key])
            .returning(AgentRun.id)
        )
        self._session.commit()
        if inserted_id is not None:
            return QuizRunReservation(
                run_id=inserted_id,
                status=RunReservationStatus.RESERVED,
            )

        run = self._session.scalar(
            select(AgentRun).where(AgentRun.idempotency_key == idempotency_key)
        )
        if run is None:
            raise RuntimeError("idempotent run disappeared after reservation conflict")
        if run.actor_id != actor_id:
            raise RunConflictError("idempotency key belongs to another actor")
        if run.request_fingerprint != request_fingerprint:
            raise RunConflictError("idempotency key input or authorized scope changed")
        if run.status == AgentRunStatus.NO_EVIDENCE.value:
            return QuizRunReservation(run_id=run.id, status=RunReservationStatus.COMPLETED)
        if run.status == AgentRunStatus.SUCCEEDED.value:
            if run.result_payload is None:
                raise ValueError("completed run has no structured result")
            return QuizRunReservation(
                run_id=run.id,
                status=RunReservationStatus.COMPLETED,
                cached_quiz=QuizDraft.model_validate(run.result_payload),
            )
        if run.status == AgentRunStatus.RUNNING.value:
            return QuizRunReservation(
                run_id=run.id,
                status=RunReservationStatus.IN_PROGRESS,
            )

        raise RuntimeError("Previous generation failed; retry requires a new operation key")

    def succeed(self, *, run_id: UUID, quiz: QuizDraft) -> None:
        """Store the validated Quiz only if the reservation is still running.

        Args:
            run_id: Reserved run identifier.
            quiz: Validated Quiz draft to replay on retries.

        Returns:
            None.

        Raises:
            RuntimeError: If no RUNNING row was updated.
            sqlalchemy.exc.SQLAlchemyError: If persistence fails.
        """

        result = self._session.execute(
            update(AgentRun)
            .where(
                AgentRun.id == run_id,
                AgentRun.status == AgentRunStatus.RUNNING.value,
            )
            .values(
                status=AgentRunStatus.SUCCEEDED.value,
                result_payload=quiz.model_dump(mode="json", by_alias=True),
                error_code=None,
            )
        )
        if result.rowcount != 1:
            self._session.rollback()
            raise RuntimeError("Quiz run is not in RUNNING state")
        self._session.commit()

    def fail(self, *, run_id: UUID, error_code: str) -> None:
        """Store a safe failure marker without prompt or provider payload.

        Args:
            run_id: Reserved run identifier.
            error_code: Safe non-blank machine-readable failure code.

        Returns:
            None.

        Raises:
            ValueError: If error_code is blank.
            sqlalchemy.exc.SQLAlchemyError: If persistence fails.
        """

        if not error_code.strip():
            raise ValueError("error_code must not be blank")
        # Reservation was committed before generation. Clear a failed result
        # transaction before recording its terminal marker in a new one.
        self._session.rollback()
        self._session.execute(
            update(AgentRun)
            .where(
                AgentRun.id == run_id,
                AgentRun.status == AgentRunStatus.RUNNING.value,
            )
            .values(
                status=(
                    AgentRunStatus.NO_EVIDENCE.value
                    if error_code == "NO_EVIDENCE"
                    else AgentRunStatus.FAILED.value
                ),
                error_code=error_code,
                result_payload=None,
            )
        )
        self._session.commit()
