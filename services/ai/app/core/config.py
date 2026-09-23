"""Environment-backed settings for the internal AI service."""

from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated runtime configuration; secret values are never serialized."""

    model_config = SettingsConfigDict(extra="ignore")

    environment: str = "local"
    internal_service_token: SecretStr = SecretStr("change_me")
    ai_database_url: str = "postgresql+psycopg://studyflow_ai:change_me@localhost:5432/studyflow"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_api_key: SecretStr = SecretStr("")
    openrouter_chat_model: str = "openai/gpt-5.6-luna"
    openrouter_embedding_model: str = "openai/text-embedding-3-large"
    embedding_dimensions: int = Field(default=1024, ge=1, le=2000)
    embedding_distance: str = "cosine"
    retrieval_top_k: int = Field(default=6, ge=1, le=20)
    retrieval_max_distance: float = Field(default=0.45, ge=0, le=2)
    ai_job_max_attempts: int = Field(default=3, ge=1, le=10)
    ai_job_retry_base_seconds: int = Field(default=5, ge=1, le=300)
    ai_worker_poll_seconds: float = Field(default=2.0, ge=0.1, le=60)

    def is_ready(self) -> bool:
        """Return whether required production integrations are configured.

        Args:
            None. Values are loaded from the process environment.
        Returns:
            bool: True when service/database/provider credentials are non-placeholder.
        Raises:
            None. This method performs no network or database calls.
        """
        token = self.internal_service_token.get_secret_value()
        api_key = self.openrouter_api_key.get_secret_value()
        return bool(token and token != "change_me" and api_key and "change_me" not in self.ai_database_url)


@lru_cache
def get_settings() -> Settings:
    """Load and cache validated settings.

    Args:
        None.
    Returns:
        Settings: Immutable-by-convention runtime configuration.
    Raises:
        pydantic.ValidationError: An environment value violates its constraint.
    """
    return Settings()


settings = get_settings()
