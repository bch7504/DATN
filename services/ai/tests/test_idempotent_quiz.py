"""Tests for duplicate-safe Quiz generation."""

import asyncio
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy.orm import Session

from app.repositories.models import AgentRun, AgentRunStatus, SourceType
from app.repositories.run_repository import RunConflictError, SqlAlchemyQuizRunRepository
from app.schemas.grounding import (
    AuthorizedDocument,
    AuthorizedScope,
    Citation,
    QuizDifficulty,
    QuizDraft,
    QuizGenerationArgs,
    QuizQuestionDraft,
)
from app.schemas.runs import QuizRunReservation, RunReservationStatus
from app.services.idempotent_quiz import (
    IdempotentQuizGenerationService,
    QuizRunInProgressError,
)


class FakeRunRepository:
    """In-memory reservation fake for a single operation."""

    def __init__(self, reservation: QuizRunReservation) -> None:
        """Create a fake with a configured reservation outcome.

        Args:
            reservation: Outcome returned by reserve.

        Returns:
            None.

        Raises:
            None.
        """

        self._reservation = reservation
        self.succeeded_quiz: QuizDraft | None = None
        self.failed_code: str | None = None

    def reserve(
        self,
        *,
        request_id: str,
        idempotency_key: str,
        actor_id: UUID,
        request_fingerprint: str,
    ) -> QuizRunReservation:
        """Return the configured reservation for valid identifiers.

        Args:
            request_id: Synthetic request identifier.
            idempotency_key: Synthetic stable operation key.
            actor_id: Synthetic actor identifier.
            request_fingerprint: Digest of the normalized generation input.

        Returns:
            Configured reservation.

        Raises:
            ValueError: If required input is blank.
        """

        if not request_id or not idempotency_key or actor_id.int == 0:
            raise ValueError("reservation input is invalid")
        return self._reservation

    def succeed(self, *, run_id: UUID, quiz: QuizDraft) -> None:
        """Record a successful Quiz result.

        Args:
            run_id: Reserved run identifier.
            quiz: Grounded generated Quiz.

        Returns:
            None.

        Raises:
            ValueError: If run_id differs from the reservation.
        """

        if run_id != self._reservation.run_id:
            raise ValueError("unexpected run identifier")
        self.succeeded_quiz = quiz

    def fail(self, *, run_id: UUID, error_code: str) -> None:
        """Record a safe failure code.

        Args:
            run_id: Reserved run identifier.
            error_code: Safe failure code.

        Returns:
            None.

        Raises:
            ValueError: If run identifier or code is invalid.
        """

        if run_id != self._reservation.run_id or not error_code:
            raise ValueError("invalid failure input")
        self.failed_code = error_code


class FakeGroundedQuizService:
    """Grounded Quiz fake that records provider-equivalent executions."""

    def __init__(self, result: QuizDraft | None) -> None:
        """Create the fake with a configured result.

        Args:
            result: Quiz draft or None for NO_EVIDENCE.

        Returns:
            None.

        Raises:
            None.
        """

        self._result = result
        self.call_count = 0

    async def generate(
        self,
        *,
        instruction: str,
        args: QuizGenerationArgs,
        scope: AuthorizedScope,
        retrieval_limit: int = 20,
    ) -> QuizDraft | None:
        """Return the configured Quiz and count executions.

        Args:
            instruction: Synthetic generation prompt.
            args: Validated generation settings.
            scope: Synthetic authorized PDF scope.
            retrieval_limit: Maximum evidence count.

        Returns:
            Configured Quiz draft or None.

        Raises:
            ValueError: If required input is invalid.
        """

        if not instruction or args.question_count < 1 or not scope.documents:
            raise ValueError("invalid generation input")
        if retrieval_limit < 1:
            raise ValueError("retrieval_limit must be positive")
        self.call_count += 1
        return self._result


def _quiz() -> QuizDraft:
    """Build a valid synthetic one-question Quiz.

    Args:
        None.

    Returns:
        Grounded MCQ_SINGLE draft.

    Raises:
        None.
    """

    return QuizDraft(
        title="Ôn tập ACID",
        questions=(
            QuizQuestionDraft(
                question="Atomicity có ý nghĩa gì?",
                options=("Toàn bộ hoặc hoàn tác", "Luôn song song", "Luôn nhanh", "Không khóa"),
                correct_option_index=0,
                explanation="Atomicity bảo đảm tính toàn vẹn của giao dịch.",
                citations=(
                    Citation(
                        document_id=uuid4(),
                        document_version=1,
                        page_number=2,
                        excerpt="Atomicity: giao dịch hoàn thành toàn bộ hoặc hoàn tác.",
                    ),
                ),
            ),
        ),
    )


def _scope(actor_id: UUID) -> AuthorizedScope:
    """Build one actor-owned Personal PDF scope.

    Args:
        actor_id: Synthetic Student identifier.

    Returns:
        Authorized scope.

    Raises:
        None.
    """

    return AuthorizedScope(
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


@pytest.mark.anyio
async def test_completed_run_replays_without_generating_again() -> None:
    """Confirm a successful retry returns cached output without an AI call."""

    actor_id = uuid4()
    cached_quiz = _quiz()
    repository = FakeRunRepository(
        QuizRunReservation(
            run_id=uuid4(),
            status=RunReservationStatus.COMPLETED,
            cached_quiz=cached_quiz,
        )
    )
    quiz_service = FakeGroundedQuizService(_quiz())
    service = IdempotentQuizGenerationService(
        run_repository=repository,
        quiz_service=quiz_service,
    )

    result = await service.generate(
        request_id="req_quiz_001",
        idempotency_key="quiz-operation-key",
        actor_id=actor_id,
        instruction="Tạo một câu hỏi",
        args=QuizGenerationArgs(question_count=1, difficulty=QuizDifficulty.MEDIUM),
        scope=_scope(actor_id),
    )

    assert result == cached_quiz
    assert quiz_service.call_count == 0


@pytest.mark.anyio
async def test_reserved_run_generates_and_caches_result() -> None:
    """Confirm a newly reserved operation stores its grounded Quiz."""

    actor_id = uuid4()
    generated_quiz = _quiz()
    repository = FakeRunRepository(
        QuizRunReservation(run_id=uuid4(), status=RunReservationStatus.RESERVED)
    )
    quiz_service = FakeGroundedQuizService(generated_quiz)
    service = IdempotentQuizGenerationService(
        run_repository=repository,
        quiz_service=quiz_service,
    )

    result = await service.generate(
        request_id="req_quiz_002",
        idempotency_key="quiz-operation-key-2",
        actor_id=actor_id,
        instruction="Tạo một câu hỏi",
        args=QuizGenerationArgs(question_count=1, difficulty=QuizDifficulty.HARD),
        scope=_scope(actor_id),
    )

    assert result == generated_quiz
    assert repository.succeeded_quiz == generated_quiz
    assert repository.failed_code is None
    assert quiz_service.call_count == 1


@pytest.mark.anyio
async def test_in_progress_run_fails_without_duplicate_generation() -> None:
    """Confirm concurrent retry receives conflict before an AI call."""

    actor_id = uuid4()
    repository = FakeRunRepository(
        QuizRunReservation(run_id=uuid4(), status=RunReservationStatus.IN_PROGRESS)
    )
    quiz_service = FakeGroundedQuizService(_quiz())
    service = IdempotentQuizGenerationService(
        run_repository=repository,
        quiz_service=quiz_service,
    )

    with pytest.raises(QuizRunInProgressError):
        await service.generate(
            request_id="req_quiz_003",
            idempotency_key="quiz-operation-key-3",
            actor_id=actor_id,
            instruction="Tạo một câu hỏi",
            args=QuizGenerationArgs(question_count=1, difficulty=QuizDifficulty.EASY),
            scope=_scope(actor_id),
        )

    assert quiz_service.call_count == 0


def test_same_key_with_changed_scope_cannot_replay_cached_quiz() -> None:
    """Source/page changes on retries must invalidate the old key before returning any content."""
    actor_id = uuid4()
    session = MagicMock(spec=Session)
    session.scalar.side_effect = [
        None,
        AgentRun(
            id=uuid4(),
            actor_id=actor_id,
            status=AgentRunStatus.SUCCEEDED.value,
            request_fingerprint="old-scope",
            result_payload=_quiz().model_dump(mode="json"),
        ),
    ]
    repository = SqlAlchemyQuizRunRepository(session)
    with pytest.raises(RunConflictError):
        repository.reserve(
            request_id="retry",
            idempotency_key="same-key",
            actor_id=actor_id,
            request_fingerprint="changed-scope",
        )


def test_failed_provider_run_is_not_blindly_reexecuted() -> None:
    """A timeout/failure requires Java to issue a new operation key explicitly."""
    actor_id = uuid4()
    session = MagicMock(spec=Session)
    session.scalar.side_effect = [
        None,
        AgentRun(
            id=uuid4(),
            actor_id=actor_id,
            status=AgentRunStatus.FAILED.value,
            request_fingerprint="same-input",
        ),
    ]
    with pytest.raises(RuntimeError, match="new operation key"):
        SqlAlchemyQuizRunRepository(session).reserve(
            request_id="retry",
            idempotency_key="same-key",
            actor_id=actor_id,
            request_fingerprint="same-input",
        )


@pytest.mark.anyio
async def test_cancelled_quiz_marks_run_failed_without_retrying_provider() -> None:
    """Args: none. Returns: None. Raises: AssertionError if cancellation leaves no marker."""
    actor_id = uuid4()
    repository = FakeRunRepository(
        QuizRunReservation(run_id=uuid4(), status=RunReservationStatus.RESERVED)
    )
    generator = MagicMock(spec=FakeGroundedQuizService)
    generator.generate = AsyncMock(side_effect=asyncio.CancelledError)
    service = IdempotentQuizGenerationService(run_repository=repository, quiz_service=generator)
    with pytest.raises(asyncio.CancelledError):
        await service.generate(
            request_id="cancelled-request",
            idempotency_key="cancelled-operation",
            actor_id=actor_id,
            instruction="Tạo một câu hỏi",
            args=QuizGenerationArgs(question_count=1, difficulty=QuizDifficulty.EASY),
            scope=_scope(actor_id),
        )
    assert repository.failed_code == "QUIZ_GENERATION_FAILED"
    generator.generate.assert_awaited_once()


def test_failure_marker_rolls_back_failed_result_transaction_first() -> None:
    """Args: none. Returns: None. Raises: AssertionError on unsafe transaction ordering."""
    session = MagicMock(spec=Session)
    SqlAlchemyQuizRunRepository(session).fail(run_id=uuid4(), error_code="QUIZ_GENERATION_FAILED")
    assert [call[0] for call in session.method_calls] == ["rollback", "execute", "commit"]
