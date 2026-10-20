"""Provider HTTP adapter tested entirely using synthetic in-process transport."""

import json
from uuid import uuid4

import httpx
import pytest

from app.clients.openrouter import OpenRouterClient
from app.repositories.models import SourceType
from app.schemas.grounding import RetrievedEvidence


@pytest.mark.anyio
async def test_embedding_reorders_response_and_requests_exact_dimensions() -> None:
    """Provider response order must not attach a vector to the wrong chunk."""

    def handler(request: httpx.Request) -> httpx.Response:
        """Args: request. Returns: synthetic embedding response. Raises: assertion errors."""
        body = json.loads(request.content)
        assert body["dimensions"] == 1024
        assert body["input"] == ["page one", "page two"]
        return httpx.Response(
            200,
            json={
                "object": "list",
                "model": "embedding-test",
                "data": [
                    {"object": "embedding", "index": 1, "embedding": [0.2] * 1024},
                    {"object": "embedding", "index": 0, "embedding": [0.1] * 1024},
                ],
                "usage": {"prompt_tokens": 4, "total_tokens": 4},
            },
        )

    provider = OpenRouterClient(
        api_key="synthetic-test-key",
        base_url="https://provider.invalid/v1",
        chat_model="chat-test",
        embedding_model="embedding-test",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    try:
        vectors = await provider.embed(("page one", "page two"))
        assert vectors[0][0] == 0.1
        assert vectors[1][0] == 0.2
    finally:
        await provider.close()


@pytest.mark.anyio
async def test_answer_provider_can_abstain_and_receives_closed_schema() -> None:
    """Low-quality retrieval must permit model abstention rather than forced citations."""
    owner_id = uuid4()

    def handler(request: httpx.Request) -> httpx.Response:
        """Args: request. Returns: synthetic abstention. Raises: assertions on unsafe payload."""
        body = json.loads(request.content)
        schema = body["response_format"]["json_schema"]
        assert schema["strict"] is True
        assert schema["schema"]["additionalProperties"] is False
        assert str(owner_id) not in request.content.decode()
        return httpx.Response(
            200,
            json={
                "id": "chat-test",
                "object": "chat.completion",
                "created": 0,
                "model": "chat-test",
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": "stop",
                        "message": {
                            "role": "assistant",
                            "content": json.dumps({"answer": None, "citedEvidenceIds": []}),
                        },
                    }
                ],
            },
        )

    provider = OpenRouterClient(
        api_key="synthetic-test-key",
        base_url="https://provider.invalid/v1",
        chat_model="chat-test",
        embedding_model="embedding-test",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    evidence = RetrievedEvidence(
        evidence_id="chunk:1",
        document_id=uuid4(),
        document_version=1,
        owner_id=owner_id,
        source_type=SourceType.PERSONAL_PDF,
        page_number=1,
        chunk_index=0,
        excerpt="ACID properties",
        relevance_score=0.5,
    )
    try:
        answer = await provider.generate_answer(
            instruction="Unrelated question", evidence=(evidence,)
        )
        assert answer.answer is None
        assert answer.cited_evidence_ids == ()
    finally:
        await provider.close()


@pytest.mark.anyio
@pytest.mark.parametrize(
    "reason,refusal", [("length", None), ("content_filter", None), ("stop", "refused")]
)
async def test_incomplete_or_refused_result_is_never_treated_as_no_evidence(
    reason: str, refusal: str | None
) -> None:
    """Args: synthetic completion status. Returns: None. Raises: AssertionError on acceptance."""

    def handler(request: httpx.Request) -> httpx.Response:
        """Args: mocked request. Returns: valid JSON with unsafe status. Raises: none."""
        return httpx.Response(
            200,
            json={
                "id": "synthetic-completion",
                "object": "chat.completion",
                "created": 0,
                "model": "chat-test",
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": reason,
                        "message": {
                            "role": "assistant",
                            "content": json.dumps({"answer": None, "citedEvidenceIds": []}),
                            "refusal": refusal,
                        },
                    }
                ],
            },
        )

    provider = OpenRouterClient(
        api_key="synthetic-test-key",
        base_url="https://provider.invalid/v1",
        chat_model="chat-test",
        embedding_model="embedding-test",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    evidence = RetrievedEvidence(
        evidence_id="chunk:1",
        document_id=uuid4(),
        document_version=1,
        owner_id=uuid4(),
        source_type=SourceType.PERSONAL_PDF,
        page_number=1,
        chunk_index=0,
        excerpt="Synthetic ACID lesson",
        relevance_score=0.9,
    )
    try:
        with pytest.raises(RuntimeError, match="did not complete"):
            await provider.generate_answer(instruction="Explain ACID", evidence=(evidence,))
    finally:
        await provider.close()
