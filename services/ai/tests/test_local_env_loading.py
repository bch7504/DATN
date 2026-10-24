"""Configuration precedence checks using only a synthetic environment fixture."""

from pathlib import Path

from pytest import MonkeyPatch

from app.core.config import REPOSITORY_ENV_FILE, Settings

FIXTURE_ENV_FILE = Path(__file__).parent / "fixtures" / "synthetic-settings.env"


def test_repository_env_path_points_to_project_root_without_reading_it() -> None:
    """The default local file must be the repository root .env, independent of cwd."""
    assert REPOSITORY_ENV_FILE.name == ".env"
    assert (REPOSITORY_ENV_FILE.parent / "services" / "ai").is_dir()


def test_settings_load_a_synthetic_env_file() -> None:
    """Pydantic loads local values without exposing them in application output."""
    settings = Settings(_env_file=FIXTURE_ENV_FILE)
    assert settings.openrouter_api_key is not None
    assert settings.openrouter_api_key.get_secret_value() == "fixture-openrouter-key"
    assert settings.openrouter_chat_model == "fixture/chat-model"


def test_process_environment_overrides_the_local_file(monkeypatch: MonkeyPatch) -> None:
    """Deployment-injected process values remain stronger than local .env values."""
    monkeypatch.setenv("OPENROUTER_CHAT_MODEL", "process/chat-model")
    settings = Settings(_env_file=FIXTURE_ENV_FILE)
    assert settings.openrouter_chat_model == "process/chat-model"
