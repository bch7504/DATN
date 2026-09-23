"""Network-free tests for the OpenRouter embedding adapter."""

from types import SimpleNamespace

import pytest

from app.clients.openrouter import OpenRouterProvider
from app.core.config import Settings
from app.core.errors import ServiceError


class FakeEmbeddings:
    """OpenAI-compatible embedding resource fixture."""

    def __init__(self, dimensions: int) -> None:
        """Args: response dimensions. Returns: None. Raises: none."""
        self._dimensions = dimensions

    def create(
        self,
        *,
        model: str,
        input: list[str],
        dimensions: int,
        encoding_format: str,
    ) -> SimpleNamespace:
        """Args: provider request fields. Returns: ordered synthetic response. Raises: assertion drift."""
        assert model == "openai/text-embedding-3-large"
        assert dimensions == 1024
        assert encoding_format == "float"
        return SimpleNamespace(
            data=[
                SimpleNamespace(index=index, embedding=[float(index)] * self._dimensions)
                for index, _ in enumerate(input)
            ]
        )


class FakeOpenAI:
    """Minimal injected provider client with no network capability."""

    def __init__(self, dimensions: int = 1024) -> None:
        """Args: response dimensions. Returns: None. Raises: none."""
        self.embeddings = FakeEmbeddings(dimensions)


def test_embedding_adapter_returns_1024_dimensions() -> None:
    """Args: none. Returns: None. Raises: AssertionError on model/dimension drift."""
    provider = OpenRouterProvider(Settings(), FakeOpenAI())  # type: ignore[arg-type]
    vectors = provider.embed(["Nội dung học thuật", "Câu hỏi truy xuất"])
    assert len(vectors) == 2
    assert all(len(vector) == 1024 for vector in vectors)


def test_embedding_adapter_rejects_empty_input() -> None:
    """Args: none. Returns: None. Raises: AssertionError if empty input reaches provider."""
    provider = OpenRouterProvider(Settings(), FakeOpenAI())  # type: ignore[arg-type]
    with pytest.raises(ServiceError, match="Embedding input cannot be empty"):
        provider.embed([" "])


def test_embedding_adapter_rejects_wrong_provider_shape() -> None:
    """Args: none. Returns: None. Raises: AssertionError if malformed response is accepted."""
    provider = OpenRouterProvider(Settings(), FakeOpenAI(dimensions=3))  # type: ignore[arg-type]
    with pytest.raises(ServiceError, match="invalid vector shape"):
        provider.embed(["Nội dung học thuật"])
