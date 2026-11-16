"""Launch exactly one local service against an already migrated Supabase project.

Args: --config PATH and --service backend|ai|worker required. Input: explicitly authorized
private Supabase configuration containing separate runtime roles and shared tokens.
Output: JSON service/PID, never environment values. Exit 0 launched / 1 sanitized failure.
Side effects: hidden child process; does not run migrations, local seeds, or read root .env.
Python application may load its normal provider configuration itself at startup.
This is not a start-all launcher; the caller must check existing listeners/workers first.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path

from dotenv import dotenv_values


def launch(config_path: Path, service: str) -> int:
    """Args: explicit private file and backend/ai/worker service. Returns: launched process PID.
    Preconditions: shared database already provisioned and runtime role/token fields present.
    No migration/admin password or machine-local copy marker is required on another developer's machine.
    Side effects: starts one hidden local process with private values in environment only.
    Raises: ValueError for missing settings/service or OSError for launch failure.
    """
    values = dotenv_values(config_path, interpolate=False, encoding="utf-8-sig")
    required = (
        "DATABASE_URL",
        "DATABASE_USERNAME",
        "DATABASE_PASSWORD",
        "AI_DATABASE_URL",
        "JWT_SECRET",
        "INTERNAL_SERVICE_TOKEN",
        "AI_SERVICE_TOKEN",
        "STORAGE_ENDPOINT",
        "STORAGE_REGION",
        "STORAGE_BUCKET",
        "STORAGE_ACCESS_KEY",
        "STORAGE_SECRET_KEY",
    )
    if any(not values.get(key) for key in required):
        raise ValueError("Runtime configuration is not prepared")
    root = Path(__file__).resolve().parents[1]
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith("SUPABASE_")
    }
    env.update({key: str(values[key]) for key in required})
    env.update(
        {
            "SPRING_PROFILES_ACTIVE": "local",
            "SPRING_FLYWAY_ENABLED": "false",
            "STUDYFLOW_LOCAL_TEACHER_ACCOUNTS_ENABLED": "false",
            "STUDYFLOW_LOCAL_STUDENT_ACCOUNTS_ENABLED": "false",
            "STUDYFLOW_DEV_SAMPLE_STUDENTS_ENABLED": "false",
            "AI_SERVICE_ENABLED": "true",
            "AI_SERVICE_URL": "http://127.0.0.1:8001",
            "AI_ALLOW_INSECURE_LOCAL_STORAGE_URL": "false",
            "STORAGE_ENABLED": "true",
            "MAIL_FROM": "no-reply@studyflow.local",
            "MAIL_HOST": "127.0.0.1",
            "MAIL_PORT": "1025",
            "PRESENTATION_CONVERTER_ENABLED": "true",
            "PRESENTATION_CONVERTER_URL": "http://127.0.0.1:3001",
        }
    )
    if service == "backend":
        cwd = root / "services" / "backend"
        command = [
            os.environ.get("COMSPEC", "cmd.exe"),
            "/d",
            "/c",
            str(cwd / "mvnw.cmd"),
            f"-Dstudyflow.build.directory={root.as_posix()}/.codex-maven-output",
            "-Dspring-boot.run.profiles=local",
            "spring-boot:run",
            "-q",
        ]
    elif service in {"ai", "worker"}:
        cwd = root / "services" / "ai"
        command = [str(cwd / ".venv" / "Scripts" / "python.exe"), "-m"]
        command += (
            [
                "uvicorn",
                "app.asgi:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8001",
                "--no-access-log",
            ]
            if service == "ai"
            else ["app.workers.documents"]
        )
    else:
        raise ValueError("Unsupported service")
    with open(os.devnull, "wb") as output:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=output,
            stderr=output,
            creationflags=subprocess.CREATE_NO_WINDOW
            | subprocess.CREATE_NEW_PROCESS_GROUP,
        )
    return process.pid


def main() -> int:
    """Args: explicit CLI config/service. Returns: exit 0/1 with safe JSON status; no raw errors."""
    parser = argparse.ArgumentParser(
        description="Start one service with private Supabase runtime settings"
    )
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--service", choices=("backend", "ai", "worker"), required=True)
    args = parser.parse_args()
    try:
        pid = launch(args.config, args.service)
        print(json.dumps({"service": args.service, "launcher_pid": pid}))
        return 0
    except Exception as error:  # noqa: BLE001 - never expose secret-bearing startup/config errors.
        print(
            json.dumps(
                {
                    "service": args.service,
                    "status": "FAILED",
                    "error_type": type(error).__name__,
                }
            )
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
