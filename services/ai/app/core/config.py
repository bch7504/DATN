"""Validated process-environment configuration.

The service deliberately does not load a local .env file. Deployment tooling
must inject environment variables explicitly.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Immutable runtime settings for one AI service process."""

    model_config = SettingsConfigDict(
        env_file=None,
        case_sensitive=True,
        extra="ignore",
        frozen=True,
    )

    app_name: str = "StudyFlow AI Service"
    app_version: str = "0.1.0"
    app_environment: Literal["development", "test", "production"] = Field(
        default="development",
        validation_alias="APP_ENVIRONMENT",
    )
    internal_service_token: SecretStr = Field(
        validation_alias="INTERNAL_SERVICE_TOKEN",
        min_length=16,
    )
    internal_schema_version: Literal["3"] = "3"
    ai_database_url: SecretStr | None = Field(
        default=None,
        validation_alias="AI_DATABASE_URL",
    )
    openrouter_base_url: AnyHttpUrl = Field(
        default="https://openrouter.ai/api/v1",
        validation_alias="OPENROUTER_BASE_URL",
    )
    openrouter_api_key: SecretStr | None = Field(
        default=None,
        validation_alias="OPENROUTER_API_KEY",
    )
    openrouter_chat_model: str = Field(
        default="openai/gpt-5.6-luna",
        validation_alias="OPENROUTER_CHAT_MODEL",
        min_length=1,
    )
    openrouter_embedding_model: str = Field(
        default="openai/text-embedding-3-large",
        validation_alias="OPENROUTER_EMBEDDING_MODEL",
        min_length=1,
    )
    embedding_dimensions: int = Field(
        default=1024,
        ge=1024,
        le=1024,
        validation_alias="EMBEDDING_DIMENSIONS",
    )
    storage_endpoint: AnyHttpUrl | None = Field(default=None, validation_alias="STORAGE_ENDPOINT")
    allow_insecure_local_storage_url: bool = Field(
        default=False,
        validation_alias="AI_ALLOW_INSECURE_LOCAL_STORAGE_URL",
    )
    job_max_attempts: int = Field(default=3, ge=1, le=10, validation_alias="AI_JOB_MAX_ATTEMPTS")
    job_retry_base_seconds: float = Field(
        default=2, ge=0.1, le=60, validation_alias="AI_JOB_RETRY_BASE_SECONDS"
    )
    worker_poll_seconds: float = Field(
        default=2, ge=0.1, le=60, validation_alias="AI_WORKER_POLL_SECONDS"
    )

    @field_validator("internal_service_token")
    @classmethod
    def reject_placeholder_token(cls, value: SecretStr) -> SecretStr:
        """Reject blank or obvious placeholder internal service tokens.

        Args:
            value: Secret token loaded from the process environment.

        Returns:
            The validated SecretStr without exposing its value.

        Raises:
            ValueError: If the token is blank or an obvious placeholder.
        """

        raw_value = value.get_secret_value().strip()
        if len(raw_value) < 16:
            raise ValueError(
                "INTERNAL_SERVICE_TOKEN must contain at least 16 non-padding characters"
            )
        blocked_values = {
            "change-me",
            "changeme",
            "replace-me",
            "replace_with_secret",
            "<secret>",
        }
        if raw_value.lower() in blocked_values:
            raise ValueError("INTERNAL_SERVICE_TOKEN must not be a placeholder")
        return SecretStr(raw_value)

    def missing_readiness_configuration(self) -> tuple[str, ...]:
        """Return names of production dependencies not yet configured.

        Args:
            None.

        Returns:
            A tuple containing safe environment-variable names. Secret values
            and connection strings are never returned.

        Raises:
            None.
        """

        missing: list[str] = []
        if self.ai_database_url is None:
            missing.append("AI_DATABASE_URL")
        if self.openrouter_api_key is None:
            missing.append("OPENROUTER_API_KEY")
        if self.storage_endpoint is None:
            missing.append("STORAGE_ENDPOINT")
        return tuple(missing)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load and cache settings from process environment variables.

    Returns:
        A validated immutable Settings instance.

    Raises:
        pydantic.ValidationError: If required configuration is missing or
            invalid.
    """

    return Settings()
