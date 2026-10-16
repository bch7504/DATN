"""Python component flows with generated PDF, fake storage/DB and fake HTTP provider.

These tests exercise real parser/services/HTTP schemas, NOT live integrations or AI quality.
"""

import json
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from pydantic import JsonValue
from test_assistant_runs import MemoryRuns
from test_grounded_generation import FakeChunkRepository
from test_idempotent_quiz import FakeRunRepository
from test_indexing_worker import FakeDownloadClient, RecordingIndexRepository, _pdf_bytes

from app.api.dependencies import (
    get_assistant_run_service,
    get_grounded_answer_service,
    get_idempotent_quiz_service,
)
from app.clients.openrouter import OpenRouterClient
from app.repositories.models import SourceType
from app.schemas.grounding import RetrievedEvidence
from app.schemas.indexing import IndexDocumentCommand
from app.schemas.runs import QuizRunReservation, RunReservationStatus
from app.services.assistant_runs import AssistantRunService
from app.services.grounded_generation import GroundedAnswerService, GroundedQuizService
from app.services.idempotent_quiz import IdempotentQuizGenerationService
from app.services.indexing import DocumentIndexWorker
from app.services.orchestrator import PersonalAssistantOrchestrator
from app.services.retrieval import RetrievalService


@pytest.mark.anyio
@pytest.mark.parametrize(
    "flow", ["ASK_DOCUMENT", "SUMMARIZE_DOCUMENT", "GENERATE_QUIZ", "TUTOR", "TEACHER_QUIZ"]
)
async def test_pdf_to_grounded_http_result(
    flow: str, application: FastAPI, valid_headers: dict[str, str]
) -> None:
    """Exercise parsed PDF pages through each supported AI flow.

    Args: flow: synthetic scenario; application/valid_headers: isolated API fixtures.
    Returns: None; changes only memory doubles and in-process HTTP state.
    Raises: AssertionError on incorrect scope, page, schema, routing or replay.
    """
    actor_id, document_id = uuid4(), uuid4()
    is_course = flow in {"TUTOR", "TEACHER_QUIZ"}
    source_type = SourceType.COURSE_MATERIAL_PDF if is_course else SourceType.PERSONAL_PDF
    calls: list[str] = []

    def provider_response(request: httpx.Request) -> httpx.Response:
        """Args: fake HTTP request. Returns: deterministic model response. Raises: assertions."""
        body = json.loads(request.content)
        if request.url.path.endswith("/embeddings"):
            calls.append("embedding")
            return httpx.Response(
                200,
                json={
                    "object": "list",
                    "model": "synthetic-embedding",
                    "data": [
                        {"object": "embedding", "index": index, "embedding": [0.25] * 1024}
                        for index in range(len(body["input"]))
                    ],
                    "usage": {"prompt_tokens": 1, "total_tokens": 1},
                },
            )
        name = body["response_format"]["json_schema"]["name"]
        calls.append(name)
        result: dict[str, JsonValue]
        if name == "personal_assistant_intent":
            result = {
                "selectedTool": flow,
                "confidence": 0.99,
                "quizArgs": {"questionCount": 1, "difficulty": "EASY", "topic": "Atomicity"}
                if flow == "GENERATE_QUIZ"
                else None,
                "clarificationQuestion": None,
            }
        else:
            supplied = json.loads(body["messages"][1]["content"])["evidence"]
            assert len(supplied) == 1
            assert supplied[0]["page_number"] == 2
            assert supplied[0]["document_id"] == str(document_id)
            assert "Atomicity" in supplied[0]["content"]
            assert "PRIVATE_PAGE_ONE" not in request.content.decode()
            evidence_id = supplied[0]["evidence_id"]
            if name == "grounded_mcq_single_quiz":
                result = {
                    "title": "Synthetic ACID Quiz",
                    "questions": [
                        {
                            "question": "Which property means all or nothing?",
                            "options": ["Atomicity", "Consistency", "Isolation", "Durability"],
                            "correctOptionIndex": 0,
                            "explanation": "Atomicity means all or nothing.",
                            "citedEvidenceIds": [evidence_id],
                        }
                    ],
                }
            else:
                result = {
                    "answer": "Atomicity means all or nothing.",
                    "citedEvidenceIds": [evidence_id],
                }
        return httpx.Response(
            200,
            json={
                "id": "synthetic",
                "object": "chat.completion",
                "created": 0,
                "model": "synthetic-chat",
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": "stop",
                        "message": {"role": "assistant", "content": json.dumps(result)},
                    }
                ],
            },
        )

    provider = OpenRouterClient(
        api_key="synthetic-key",
        base_url="https://provider.invalid/v1",
        chat_model="synthetic-chat",
        embedding_model="synthetic-embedding",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(provider_response)),
    )
    try:
        index = RecordingIndexRepository()
        worker = DocumentIndexWorker(
            download_client=FakeDownloadClient(
                _pdf_bytes(
                    "PRIVATE_PAGE_ONE is outside the question scope.",
                    "Atomicity means a transaction completes all operations or none.",
                )
            ),
            embedding_client=provider,
            index_repository=index,
            embedding_model="synthetic-embedding",
        )
        artifact = await worker.execute(
            IndexDocumentCommand(
                request_id="synthetic-index",
                idempotency_key="synthetic-index-key",
                document_id=document_id,
                document_version=1,
                owner_id=actor_id,
                source_type=source_type,
                pipeline_version="synthetic-v1",
                signed_url="https://storage.invalid/synthetic.pdf",
                mime_type="application/pdf",
            )
        )
        assert artifact.page_count == 2
        evidence = tuple(
            RetrievedEvidence(
                evidence_id=f"chunk:{item.chunk.chunk_index}",
                document_id=document_id,
                document_version=1,
                owner_id=actor_id,
                source_type=source_type,
                page_number=item.chunk.page_number,
                chunk_index=item.chunk.chunk_index,
                excerpt=item.chunk.text,
                relevance_score=0.9,
            )
            for item in index.chunks
        )
        retrieval = RetrievalService(
            embedding_client=provider, chunk_repository=FakeChunkRepository(evidence)
        )
        answers = GroundedAnswerService(retrieval_service=retrieval, generation_client=provider)
        quizzes = GroundedQuizService(retrieval_service=retrieval, generation_client=provider)
        assistant = AssistantRunService(
            store=MemoryRuns(),
            executor=PersonalAssistantOrchestrator(
                intent_client=provider,
                answer_service=answers,
                quiz_service=quizzes,
            ),
        )
        quiz_service = IdempotentQuizGenerationService(
            run_repository=FakeRunRepository(
                QuizRunReservation(
                    run_id=uuid4(),
                    status=RunReservationStatus.RESERVED,
                )
            ),
            quiz_service=quizzes,
        )

        def get_answers() -> GroundedAnswerService:
            """Args: none. Returns: real service with fake I/O. Raises: none."""
            return answers

        def get_assistant() -> AssistantRunService:
            """Args: none. Returns: real orchestrator with fake I/O. Raises: none."""
            return assistant

        def get_quizzes() -> IdempotentQuizGenerationService:
            """Args: none. Returns: real Quiz service with fake I/O. Raises: none."""
            return quiz_service

        application.dependency_overrides[get_grounded_answer_service] = get_answers
        application.dependency_overrides[get_assistant_run_service] = get_assistant
        application.dependency_overrides[get_idempotent_quiz_service] = get_quizzes
        document = {
            "documentId": str(document_id),
            "documentVersion": 1,
            "ownerId": str(actor_id),
            "sourceType": source_type.value,
            "allowedPages": [2],
        }
        headers = {**valid_headers, "Idempotency-Key": "synthetic-teacher-quiz"}
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://test"
        ) as client:
            if flow == "TUTOR":
                response = await client.post(
                    "/internal/v1/course-materials/ask",
                    headers=headers,
                    json={
                        "userId": str(actor_id),
                        "courseOfferingId": str(uuid4()),
                        "document": document,
                        "currentPageNumber": 2,
                        "question": "Explain Atomicity",
                    },
                )
            elif flow == "TEACHER_QUIZ":
                response = await client.post(
                    "/internal/v1/quizzes/generate",
                    headers=headers,
                    json={
                        "actorId": str(actor_id),
                        "mode": "COURSE_TEACHER",
                        "documents": [document],
                        "instruction": "Create one easy Atomicity question",
                        "generationArgs": {"questionCount": 1, "difficulty": "EASY"},
                    },
                )
            else:
                payload = {"userId": str(actor_id), "documents": [document], "message": flow}
                response = await client.post(
                    "/internal/v1/personal-assistant/runs", headers=headers, json=payload
                )
                before_replay = len(calls)
                replay = await client.post(
                    "/internal/v1/personal-assistant/runs", headers=headers, json=payload
                )
                assert replay.json() == response.json()
                assert len(calls) == before_replay
        assert response.status_code == 200, response.text
        output = response.json() if flow == "TEACHER_QUIZ" else response.json()["result"]
        if flow in {"TEACHER_QUIZ", "GENERATE_QUIZ"}:
            question = output["quiz"]["questions"][0]
            assert len(question["options"]) == 4
            assert question["correctOptionIndex"] == 0
            citation = question["citations"][0]
        else:
            assert output["answer"] == "Atomicity means all or nothing."
            citation = output["citations"][0]
        assert citation["documentId"] == str(document_id)
        assert citation["pageNumber"] == 2
        assert "Atomicity" in citation["excerpt"]
        assert (
            "personal_assistant_intent" in calls
            if not is_course
            else "personal_assistant_intent" not in calls
        )
    finally:
        await provider.close()
