"""Bind Personal Assistant tool execution to one stable Java request identity."""

import asyncio
import hashlib
import json
from typing import Protocol
from uuid import UUID

from app.repositories.assistant_run_repository import AssistantRunStore
from app.schemas.grounding import AuthorizedScope
from app.schemas.orchestration import AssistantRunResult, ConversationTurn
from app.schemas.runs import RunReservationStatus
from app.services.idempotent_quiz import QuizRunInProgressError


class AssistantExecutor(Protocol):
    """Single Orchestrator execution boundary."""

    async def run(
        self, *, message: str, scope: AuthorizedScope, history: tuple[ConversationTurn, ...] = ()
    ) -> AssistantRunResult:
        """Args: message, Java scope, bounded history. Returns: tool output.

        Raises: ValueError for invalid input; provider/database failures.
        """


class AssistantRunService:
    """Prevents duplicate AI Quiz generation when an assistant request is retried."""

    def __init__(self, *, store: AssistantRunStore, executor: AssistantExecutor) -> None:
        """Bind dependencies. Args: durable store, single agent executor. Returns: None.

        Raises: None.
        """
        self._store = store
        self._executor = executor

    async def execute(
        self,
        *,
        request_id: str,
        conversation_id: UUID | None,
        message: str,
        scope: AuthorizedScope,
        history: tuple[ConversationTurn, ...] = (),
    ) -> AssistantRunResult:
        """Execute/replay one run; never treats user messages as operation identities.

        Args: request_id: stable Java ID; conversation_id: optional conversation;
            message: current user text; scope: authorized PDFs; history: bounded turns.
        Returns: Cached or newly generated structured tool outcome; persists AI run only.
        Raises: Conflict/in-progress errors, validation failures or dependency errors.
        """
        fingerprint = hashlib.sha256(
            json.dumps(
                {
                    "message": message.strip(),
                    "conversation": str(conversation_id),
                    "scope": scope.model_dump(mode="json"),
                    "history": [turn.model_dump(mode="json") for turn in history],
                },
                sort_keys=True,
                ensure_ascii=False,
            ).encode("utf-8")
        ).hexdigest()
        key = "assistant:" + hashlib.sha256(request_id.encode("utf-8")).hexdigest()
        reservation = self._store.reserve(
            request_id=request_id,
            key=key,
            actor_id=scope.actor_id,
            conversation_id=conversation_id,
            fingerprint=fingerprint,
        )
        if reservation.status is RunReservationStatus.COMPLETED:
            if reservation.cached_result is None:
                raise RuntimeError("Completed assistant run is missing output")
            return reservation.cached_result
        if reservation.status is RunReservationStatus.IN_PROGRESS:
            raise QuizRunInProgressError("Assistant request is already in progress")
        try:
            result = await self._executor.run(message=message, scope=scope, history=history)
            self._store.complete(run_id=reservation.run_id, result=result)
            return result
        except (Exception, asyncio.CancelledError):
            self._store.fail(run_id=reservation.run_id)
            raise
