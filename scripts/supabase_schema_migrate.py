"""Apply forward Java/Flyway migrations to the existing shared Supabase app schema.

CLI args: --config PATH and --apply required. Input: explicitly authorized migration config,
reviewed services/backend migration files and Docker. Output: version/count/exit metadata only.
Exit 0 migration verified / 1 sanitized failure. Side effects: forward app schema/data changes;
no source reset, automatic rollback command, ai migration, seed or credential output.
The caller coordinates downtime and tests before invoking this privileged command.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path

from supabase_check import load_config
from supabase_migrate import connect


def migrate(path: Path) -> dict[str, str | int]:
    """Args: private config path. Returns: safe applied version/account totals.
    Raises: config, DB, subprocess or verification errors; main suppresses raw details.
    Performs native Flyway migration using env-only admin credentials and read-only SQL mount.
    """
    config = load_config(path)
    root = Path(__file__).resolve().parents[1]
    with connect(config) as conn:
        before = conn.execute(
            "SELECT count(*) FROM app.users WHERE role IN ('STUDENT','TEACHER') AND username IS DISTINCT FROM email"
        ).fetchone()[0]
    env = dict(
        os.environ,
        FLYWAY_URL=f"jdbc:postgresql://{config.host}:5432/{config.database}?sslmode=require",
        FLYWAY_USER=config.username,
        FLYWAY_PASSWORD=config.password,
        FLYWAY_SCHEMAS="app",
        FLYWAY_DEFAULT_SCHEMA="app",
        FLYWAY_OUT_OF_ORDER="true",
    )
    command = ["docker", "run", "--rm"]
    for key in (
        "FLYWAY_URL",
        "FLYWAY_USER",
        "FLYWAY_PASSWORD",
        "FLYWAY_SCHEMAS",
        "FLYWAY_DEFAULT_SCHEMA",
        "FLYWAY_OUT_OF_ORDER",
    ):
        command.extend(["-e", key])
    command.extend(
        [
            "-v",
            str(root / "services/backend/src/main/resources/db/migration")
            + ":/flyway/sql:ro",
            "flyway/flyway:10.20.1-alpine",
            "migrate",
        ]
    )
    result = subprocess.run(
        command, env=env, capture_output=True, check=False, timeout=180
    )
    if result.returncode:
        raise RuntimeError("Flyway migration failed; raw output suppressed")
    with connect(config) as conn:
        version = conn.execute(
            "SELECT version FROM app.flyway_schema_history WHERE success AND version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1"
        ).fetchone()[0]
        remaining = conn.execute(
            "SELECT count(*) FROM app.users WHERE role IN ('STUDENT','TEACHER') AND username IS DISTINCT FROM email"
        ).fetchone()[0]
        if remaining:
            raise RuntimeError("Account username normalization did not complete")
    return {
        "flyway_version": str(version),
        "accounts_normalized": int(before),
        "remaining_short_usernames": int(remaining),
    }


def main() -> int:
    """Args: --config and explicit --apply. Returns: exit 0/1, sanitized JSON; no raw exception output."""
    parser = argparse.ArgumentParser(
        description="Coordinated forward migrations on shared Supabase app"
    )
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--apply", action="store_true", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(migrate(args.config)))
        return 0
    except Exception as error:  # noqa: BLE001 - admin connection/config errors must not expose secret values.
        print(json.dumps({"migration": "FAILED", "error_type": type(error).__name__}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
