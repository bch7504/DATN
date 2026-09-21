"""Environment-backed settings for the internal AI service."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "local"
    internal_service_token: str
    ai_database_url: str
    ai_provider: str = "openai"
    ai_api_key: str
    ai_chat_model: str
    ai_embedding_model: str


settings = Settings()
