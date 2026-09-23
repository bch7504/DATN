"""OpenRouter adapter used by later document and generation pipelines."""

from collections.abc import Sequence

from openai import OpenAI

from app.core.config import Settings, settings
from app.core.errors import ServiceError


class OpenRouterProvider:
    """Typed OpenRouter client that keeps provider details outside pipelines."""

    def __init__(self, config: Settings = settings, client: OpenAI | None = None) -> None:
        """Create the provider adapter.

        Args:
            config: Validated runtime settings including model IDs and dimensions.
            client: Optional injected OpenAI-compatible client for synthetic tests.
        Returns:
            None. Initializes a reusable provider client.
        Raises:
            ServiceError: `PROVIDER_NOT_CONFIGURED` when no API key is available.
        """
        api_key = config.openrouter_api_key.get_secret_value()
        if client is None and not api_key:
            raise ServiceError(
                "PROVIDER_NOT_CONFIGURED",
                "OpenRouter provider is not configured",
                503,
            )
        self._config = config
        self._client = client or OpenAI(api_key=api_key, base_url=config.openrouter_base_url)

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed non-empty text inputs with the configured 1024-dimension model.

        Args:
            texts: Ordered chunk/query strings; every item must contain visible text.
        Returns:
            list[list[float]]: Vectors in input order with configured dimensions.
        Raises:
            ServiceError: Invalid input or malformed provider response.
            openai.OpenAIError: Provider/network error for the caller to map/retry safely.
        """
        normalized = [text.strip() for text in texts]
        if not normalized or any(not text for text in normalized):
            raise ServiceError("INVALID_EMBEDDING_INPUT", "Embedding input cannot be empty", 422)
        response = self._client.embeddings.create(
            model=self._config.openrouter_embedding_model,
            input=normalized,
            dimensions=self._config.embedding_dimensions,
            encoding_format="float",
        )
        vectors = [item.embedding for item in sorted(response.data, key=lambda item: item.index)]
        if len(vectors) != len(normalized) or any(
            len(vector) != self._config.embedding_dimensions for vector in vectors
        ):
            raise ServiceError(
                "INVALID_PROVIDER_RESPONSE",
                "Embedding provider returned an invalid vector shape",
                502,
            )
        return vectors
