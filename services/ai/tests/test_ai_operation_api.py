"""Version-3 contract tests for assistant and Tutor HTTP endpoints."""

from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.dependencies import (
    get_assistant_run_service,
    get_grounded_answer_service,
    get_idempotent_quiz_service,
)
from app.schemas.grounding import (
    AnswerStatus,
    AuthorizedScope,
    Citation,
    GroundedAnswerResult,
    QuizDraft,
    QuizGenerationArgs,
    QuizQuestionDraft,
)
from app.schemas.orchestration import (
    AssistantRunResult,
    AssistantRunStatus,
    AssistantTool,
    ConversationTurn,
)


class StubOrchestrator:
    """Endpoint stub returning a grounded summary result."""

    def __init__(self, result: AssistantRunResult) -> None:
        """Create the stub with one response.

        Args:
            result: Result returned by run.

        Returns:
            None.

        Raises:
            None.
        """

        self._result = result

    async def execute(
        self,
        *,
        message: str,
        request_id: str,
        conversation_id: UUID | None,
        scope: AuthorizedScope,
        history: tuple[ConversationTurn, ...] = (),
    ) -> AssistantRunResult:
        """Return the configured result after basic input assertions.

        Args:
            message: Current user message.
            scope: Personal document scope converted by the endpoint.
            history: Bounded conversation history.

        Returns:
            Configured assistant result.

        Raises:
            ValueError: If expected input is absent.
        """

        if not message or not scope.documents or len(history) > 12:
            raise ValueError("invalid stub input")
        return self._result


class StubAnswerService:
    """Endpoint stub returning one grounded Tutor answer."""

    def __init__(self, result: GroundedAnswerResult) -> None:
        """Create the stub with one response.

        Args:
            result: Result returned by answer.

        Returns:
            None.

        Raises:
            None.
        """

        self._result = result

    async def answer(
        self,
        *,
        instruction: str,
        scope: AuthorizedScope,
        retrieval_limit: int = 8,
    ) -> GroundedAnswerResult:
        """Return the configured result after checking current-page context.

        Args:
            instruction: Student question.
            scope: Course PDF scope built by the endpoint.
            retrieval_limit: Maximum chunks requested by the endpoint.

        Returns:
            Configured answer result.

        Raises:
            ValueError: If required context is absent.
        """

        if not instruction or scope.current_page_number is None or retrieval_limit < 1:
            raise ValueError("invalid stub input")
        return self._result


class StubIdempotentQuizService:
    """Endpoint stub that returns a cached synthetic Quiz result."""

    def __init__(self, quiz: QuizDraft) -> None:
        """Create the stub with one Quiz draft.

        Args:
            quiz: Validated synthetic Quiz draft.

        Returns:
            None.

        Raises:
            None.
        """

        self._quiz = quiz

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
        """Return the configured Quiz for valid endpoint input.

        Args:
            request_id: Cross-service trace identifier.
            idempotency_key: Stable synthetic operation key.
            actor_id: Synthetic authorized caller.
            instruction: Synthetic generation prompt.
            args: Structured Quiz settings.
            scope: Authorized PDF scope.

        Returns:
            Configured Quiz draft.

        Raises:
            ValueError: If required endpoint input is missing.
        """

        if (
            not request_id
            or not idempotency_key
            or actor_id != scope.actor_id
            or not instruction
            or args.question_count < 1
        ):
            raise ValueError("invalid stub input")
        return self._quiz


@pytest.mark.anyio
async def test_personal_assistant_endpoint_uses_camel_case_contract(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Confirm Personal Assistant accepts and returns the version-3 wire shape."""

    user_id = uuid4()
    document_id = uuid4()
    citation = Citation(
        document_id=document_id,
        document_version=1,
        page_number=3,
        excerpt="Nội dung tổng hợp từ trang ba.",
    )

    def override_orchestrator() -> StubOrchestrator:
        """Return a synthetic orchestrator without provider or database calls."""

        return StubOrchestrator(
            AssistantRunResult(
                selected_tool=AssistantTool.SUMMARIZE_DOCUMENT,
                status=AssistantRunStatus.SUMMARIZED,
                answer="Bản tóm tắt có căn cứ.",
                citations=(citation,),
            )
        )

    application.dependency_overrides[get_assistant_run_service] = override_orchestrator
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/internal/v1/personal-assistant/runs",
            headers=valid_headers,
            json={
                "userId": str(user_id),
                "conversationId": str(uuid4()),
                "documents": [
                    {
                        "documentId": str(document_id),
                        "documentVersion": 1,
                        "ownerId": str(user_id),
                        "sourceType": "PERSONAL_PDF",
                    }
                ],
                "history": [],
                "message": "Tóm tắt tài liệu",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["requestId"] == "req_health_001"
    assert body["result"]["selectedTool"] == "SUMMARIZE_DOCUMENT"
    assert body["result"]["citations"][0]["pageNumber"] == 3
    assert "selected_tool" not in response.text


@pytest.mark.anyio
async def test_course_material_endpoint_preserves_current_page_scope(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Confirm Tutor input is limited to Course Material and current page."""

    document_id = uuid4()

    def override_answer_service() -> StubAnswerService:
        """Return a synthetic Tutor service without external calls."""

        return StubAnswerService(GroundedAnswerResult(status=AnswerStatus.NO_EVIDENCE))

    application.dependency_overrides[get_grounded_answer_service] = override_answer_service
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/internal/v1/course-materials/ask",
            headers=valid_headers,
            json={
                "userId": str(uuid4()),
                "courseOfferingId": str(uuid4()),
                "document": {
                    "documentId": str(document_id),
                    "documentVersion": 2,
                    "sourceType": "COURSE_MATERIAL_PDF",
                    "allowedPages": [4, 5],
                },
                "currentPageNumber": 4,
                "question": "Trang này giải thích điều gì?",
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "requestId": "req_health_001",
        "result": {"status": "NO_EVIDENCE", "answer": None, "citations": []},
    }


@pytest.mark.anyio
async def test_quiz_endpoint_requires_key_and_returns_four_options(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Exercise valid, missing-header, and wrong-owner requests without network I/O."""

    actor_id, document_id = uuid4(), uuid4()
    quiz = QuizDraft(
        title="ACID",
        questions=(
            QuizQuestionDraft(
                question="Which property guarantees all-or-nothing execution?",
                options=("Atomicity", "Consistency", "Isolation", "Durability"),
                correct_option_index=0,
                explanation="Atomicity means all or nothing.",
                citations=(
                    Citation(
                        document_id=document_id,
                        document_version=1,
                        page_number=1,
                        excerpt="Atomicity: all or nothing.",
                    ),
                ),
            ),
        ),
    )

    def override_quiz_service() -> StubIdempotentQuizService:
        """Return synthetic Quiz dependency; no side effects or errors."""
        return StubIdempotentQuizService(quiz)

    application.dependency_overrides[get_idempotent_quiz_service] = override_quiz_service
    payload = {
        "actorId": str(actor_id),
        "mode": "PERSONAL_STUDENT",
        "documents": [
            {
                "documentId": str(document_id),
                "documentVersion": 1,
                "ownerId": str(actor_id),
                "sourceType": "PERSONAL_PDF",
            }
        ],
        "instruction": "Create one easy question about ACID",
        "generationArgs": {"questionCount": 1, "difficulty": "EASY"},
    }
    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as client:
        missing_key = await client.post(
            "/internal/v1/quizzes/generate", headers=valid_headers, json=payload
        )
        headers = {**valid_headers, "Idempotency-Key": "quiz-test-operation"}
        valid = await client.post("/internal/v1/quizzes/generate", headers=headers, json=payload)
        invalid = await client.post(
            "/internal/v1/quizzes/generate",
            headers=headers,
            json={**payload, "actorId": str(uuid4())},
        )
    assert missing_key.status_code == 422
    assert invalid.status_code == 422
    assert valid.status_code == 200
    question = valid.json()["quiz"]["questions"][0]
    assert len(question["options"]) == 4
    assert question["correctOptionIndex"] == 0
    assert question["citations"][0]["documentId"] == str(document_id)
