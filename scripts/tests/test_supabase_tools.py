"""Synthetic contracts for migration configuration and sanitized preflight output."""

import json
import sys
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import supabase_check
import supabase_run
from supabase_check import ConnectionConfig, check, load_config
from supabase_migrate import object_request


@pytest.fixture
def config() -> ConnectionConfig:
    """Args: none. Returns: synthetic connection values; no real account or network access."""
    return ConnectionConfig(
        "aws-1-region.pooler.supabase.com",
        5432,
        "postgres",
        "postgres.synthetic",
        "synthetic-password",
        "https://synthetic.storage.supabase.co/storage/v1/s3",
        "ap-southeast-2",
        "synthetic-bucket",
        "synthetic-access",
        "synthetic-key",
    )


def test_config_template_has_required_fields_and_no_real_values(tmp_path: Path) -> None:
    """Args: temporary directory. Returns: None; missing secrets rejected before network I/O."""
    template = (
        Path(__file__).resolve().parents[2] / "infrastructure/supabase/.env.example"
    )
    with pytest.raises(ValueError):
        load_config(template)
    path = tmp_path / "synthetic.conf"
    path.write_text(
        template.read_text()
        .replace("SUPABASE_DB_PASSWORD=", "SUPABASE_DB_PASSWORD='synthetic-value'")
        .replace("STORAGE_ACCESS_KEY=", "STORAGE_ACCESS_KEY='synthetic-access'")
        .replace("STORAGE_SECRET_KEY=", "STORAGE_SECRET_KEY='synthetic-key'")
    )
    loaded = load_config(path)
    assert loaded.port == 5432
    assert loaded.bucket == "studyflow-documents"
    assert "synthetic-value" not in repr(loaded)
    assert "synthetic-key" not in repr(loaded)


def test_preflight_suppresses_provider_error_values(
    config: ConnectionConfig, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Args: synthetic config/patcher. Returns: None; error output cannot leak a password or key."""

    def fail_connect(**kwargs: str | int) -> None:
        """Args: ignored connection fields. Returns: never. Raises: synthetic provider error."""
        raise supabase_check.psycopg.OperationalError(
            config.password + config.secret_key
        )

    def bucket_head(url: str, **kwargs: object) -> httpx.Response:
        """Args: synthetic URL/options. Returns: successful mock HEAD; no network I/O."""
        return httpx.Response(200)

    monkeypatch.setattr(supabase_check.psycopg, "connect", fail_connect)
    monkeypatch.setattr(supabase_check.httpx, "head", bucket_head)
    output = check(config)
    assert output["database"] == "FAILED"
    assert output["storage"] == "OK"
    assert config.password not in json.dumps(output)
    assert config.secret_key not in json.dumps(output)


def test_s3_does_not_follow_redirect_or_leak_error_body(
    config: ConnectionConfig,
) -> None:
    """Args: synthetic config. Returns: None; S3 redirects cannot forward signed credentials."""
    calls: list[str] = []

    def redirect(request: httpx.Request) -> httpx.Response:
        """Args: mock request. Returns: redirect with sensitive fake body; records origin only."""
        calls.append(request.url.host)
        return httpx.Response(
            302,
            headers={"location": "https://elsewhere.invalid"},
            content=config.secret_key.encode(),
        )

    with (
        httpx.Client(transport=httpx.MockTransport(redirect)) as client,
        pytest.raises(RuntimeError) as error,
    ):
        object_request(client, config, "GET", "synthetic.pdf")
    assert calls == ["synthetic.storage.supabase.co"]
    assert config.secret_key not in str(error.value)


def test_teammate_launch_needs_no_admin_password_or_local_marker(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Args: temp directory/patcher. Returns: None; runtime-only config launches with seeds disabled.
    No actual process/network or private file access occurs; admin settings must not reach children.
    """
    template = (
        Path(__file__).resolve().parents[2]
        / "infrastructure/supabase/runtime/.env.example"
    )
    text = template.read_text()
    for key in (
        "DATABASE_PASSWORD",
        "AI_DATABASE_URL",
        "JWT_SECRET",
        "INTERNAL_SERVICE_TOKEN",
        "AI_SERVICE_TOKEN",
        "STORAGE_ACCESS_KEY",
        "STORAGE_SECRET_KEY",
    ):
        text = text.replace(key + "=\n", key + "=synthetic-value\n")
    path = tmp_path / "runtime.conf"
    path.write_text(text)
    monkeypatch.setenv("SUPABASE_DB_PASSWORD", "synthetic-admin")
    captured: dict[str, object] = {}

    def fake_process(command: list[str], **options: object) -> SimpleNamespace:
        """Args: command/options. Returns: fake PID; captures launch options without running code."""
        captured.update(options)
        return SimpleNamespace(pid=1234)

    monkeypatch.setattr(supabase_run.subprocess, "Popen", fake_process)
    assert supabase_run.launch(path, "backend") == 1234
    environment = captured["env"]
    assert isinstance(environment, dict)
    assert "SUPABASE_DB_PASSWORD" not in environment
    assert environment["SPRING_FLYWAY_ENABLED"] == "false"
    assert environment["STUDYFLOW_LOCAL_TEACHER_ACCOUNTS_ENABLED"] == "false"
    assert environment["STUDYFLOW_LOCAL_STUDENT_ACCOUNTS_ENABLED"] == "false"
