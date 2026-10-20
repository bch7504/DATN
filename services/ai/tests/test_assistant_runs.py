"""Stable-request replay tests for Personal Assistant tool execution."""

from uuid import UUID, uuid4

import pytest

from app.repositories.assistant_run_repository import AssistantReservation
from app.repositories.models import SourceType
from app.repositories.run_repository import RunConflictError
from app.schemas.grounding import AuthorizedDocument, AuthorizedScope
from app.schemas.orchestration import (
    AssistantRunResult,
    AssistantRunStatus,
    AssistantTool,
    ConversationTurn,
)
from app.schemas.runs import RunReservationStatus
from app.services.assistant_runs import AssistantRunService


class MemoryRuns:
    """Single-key fixture store used only for deterministic replay tests."""

    def __init__(self) -> None:
        """Initialize fixture. Args: none. Returns: None. Raises: none."""
        self.run_id = uuid4()
        self.fingerprint: str | None = None
        self.result: AssistantRunResult | None = None

    def reserve(
        self,
        *,
        request_id: str,
        key: str,
        actor_id: UUID,
        conversation_id: UUID | None,
        fingerprint: str,
    ) -> AssistantReservation:
        """Args: trace/key/actor/conversation/digest. Returns: reservation. Raises: conflict."""
        if self.fingerprint is not None and fingerprint != self.fingerprint:
            raise RunConflictError("changed payload")
        self.fingerprint = fingerprint
        return AssistantReservation(
            run_id=self.run_id,
            status=RunReservationStatus.COMPLETED if self.result else RunReservationStatus.RESERVED,
            cached_result=self.result,
        )

    def complete(self, *, run_id: UUID, result: AssistantRunResult) -> None:
        """Args: run, output. Returns: None; stores fixture. Raises: none."""
        self.result = result

    def fail(self, *, run_id: UUID) -> None:
        """Args: run. Returns: None; no-op failure fixture. Raises: none."""


class CountingAgent:
    """Count executions without invoking models."""

    def __init__(self) -> None:
        """Args: none. Returns: None. Raises: none."""
        self.calls = 0

    async def run(
        self, *, message: str, scope: AuthorizedScope, history: tuple[ConversationTurn, ...] = ()
    ) -> AssistantRunResult:
        """Args: prompt, scoped documents, history. Returns: abstention. Raises: none."""
        self.calls += 1
        return AssistantRunResult(
            selected_tool=AssistantTool.GENERATE_QUIZ, status=AssistantRunStatus.NO_EVIDENCE
        )


@pytest.mark.anyio
async def test_assistant_retry_replays_and_changed_prompt_conflicts() -> None:
    """A lost HTTP response must not trigger another classifier/tool execution."""
    actor_id = uuid4()
    scope = AuthorizedScope(
        actor_id=actor_id,
        documents=(
            AuthorizedDocument(
                document_id=uuid4(),
                document_version=1,
                owner_id=actor_id,
                source_type=SourceType.PERSONAL_PDF,
            ),
        ),
    )
    agent = CountingAgent()
    service = AssistantRunService(store=MemoryRuns(), executor=agent)
    first = await service.execute(
        request_id="req-fixed", conversation_id=None, message="Create questions", scope=scope
    )
    retry = await service.execute(
        request_id="req-fixed", conversation_id=None, message="Create questions", scope=scope
    )
    assert first == retry
    assert agent.calls == 1
    with pytest.raises(RunConflictError):
        await service.execute(
            request_id="req-fixed", conversation_id=None, message="Different question", scope=scope
        )
    assert agent.calls == 1
