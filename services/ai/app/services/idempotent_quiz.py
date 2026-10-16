"""Idempotent wrapper around grounded Quiz generation."""

import asyncio
import hashlib
import json
from typing import Protocol
from uuid import UUID

from app.repositories.run_repository import QuizRunRepository
from app.schemas.grounding import AuthorizedScope, QuizDraft, QuizGenerationArgs
from app.schemas.runs import RunReservationStatus


class GroundedQuizGenerator(Protocol):
    """Narrow contract required by the idempotency wrapper."""

    async def generate(
        self,
        *,
        instruction: str,
        args: QuizGenerationArgs,
        scope: AuthorizedScope,
        retrieval_limit: int = 20,
    ) -> QuizDraft | None:
        """Generate one grounded Quiz draft or NO_EVIDENCE.

        Args:
            instruction: User generation prompt.
            args: Trusted structured Quiz settings.
            scope: Authorized PDF scope.
            retrieval_limit: Maximum retrieved chunks.

        Returns:
            Grounded Quiz or None when evidence is insufficient.

        Raises:
            ValueError: If input or generated output is invalid.
            RuntimeError: If retrieval or generation fails.
        """


class QuizRunInProgressError(Exception):
    """Raised when another request is executing the same idempotency key."""


class IdempotentQuizGenerationService:
    """Replay completed Quiz drafts and prevent duplicate provider calls."""

    def __init__(
        self,
        *,
        run_repository: QuizRunRepository,
        quiz_service: GroundedQuizGenerator,
    ) -> None:
        """Create an idempotent Quiz service.

        Args:
            run_repository: Durable run reservation and result store.
            quiz_service: Grounded MCQ_SINGLE generator.

        Returns:
            None.

        Raises:
            None.
        """

        self._run_repository = run_repository
        self._quiz_service = quiz_service

    async def generate(
        self,
        *,
        request_id: str,
        idempotency_key: str,
        actor_id: UUID,
        instruction: str,
        args: QuizGenerationArgs,
        scope: AuthorizedScope,
    ) -> QuizDraft | None:
        """Generate once, replay success, or return None for NO_EVIDENCE.

        Args:
            request_id: Cross-service trace identifier.
            idempotency_key: Stable Java operation key.
            actor_id: Authorized Student or Teacher identifier.
            instruction: User generation request.
            args: Trusted question count, difficulty, and topic.
            scope: Authorized PDF document/page scope.

        Returns:
            New or cached Quiz draft, or None when evidence is insufficient.

        Raises:
            QuizRunInProgressError: If the same key is currently running.
            ValueError: If input, scope, provider output, or ownership is invalid.
            RuntimeError: If retrieval, provider, or persistence fails.
        """

        if actor_id != scope.actor_id:
            raise ValueError("actor must match authorized scope")
        fingerprint = hashlib.sha256(
            json.dumps(
                {
                    "instruction": instruction.strip(),
                    "args": args.model_dump(mode="json"),
                    "scope": scope.model_dump(mode="json"),
                },
                sort_keys=True,
                ensure_ascii=False,
            ).encode("utf-8")
        ).hexdigest()
        reservation = self._run_repository.reserve(
            request_id=request_id,
            idempotency_key="quiz:" + hashlib.sha256(idempotency_key.encode("utf-8")).hexdigest(),
            actor_id=actor_id,
            request_fingerprint=fingerprint,
        )
        if reservation.status is RunReservationStatus.COMPLETED:
            return reservation.cached_quiz
        if reservation.status is RunReservationStatus.IN_PROGRESS:
            raise QuizRunInProgressError("Quiz generation is already in progress")

        try:
            quiz = await self._quiz_service.generate(
                instruction=instruction,
                args=args,
                scope=scope,
            )
            if quiz is None:
                self._run_repository.fail(
                    run_id=reservation.run_id,
                    error_code="NO_EVIDENCE",
                )
                return None
            self._run_repository.succeed(run_id=reservation.run_id, quiz=quiz)
            return quiz
        except (Exception, asyncio.CancelledError):
            self._run_repository.fail(
                run_id=reservation.run_id,
                error_code="QUIZ_GENERATION_FAILED",
            )
            raise
