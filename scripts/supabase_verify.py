"""Read-only post-copy checks and verified runtime marker.

Args: --config PATH required. Input: authorized private configuration, existing copied DB,
quiescent source and provisioned runtime roles. Output: counts/permission booleans only.
Exit 0 matches / 1 sanitized failure. Side effect: writes ignored migration marker after
matching every app/ai table count and confirming role isolation/vector operation.
No object content or credentials are printed; this check does not copy or delete data.
"""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

import psycopg
from dotenv import dotenv_values
from supabase_check import load_config
from supabase_migrate import connect, table_counts


def verify(path: Path) -> dict[str, int | str | bool]:
    """Args: private config. Returns: table/row counts and role/vector results.
    Raises: DB/input errors or RuntimeError on mismatch. Marks runtime ready only on success.
    """
    config = load_config(path)
    values = dotenv_values(path, interpolate=False, encoding="utf-8-sig")
    with psycopg.connect(
        host="127.0.0.1",
        port=5433,
        dbname="studyflow",
        user="studyflow_admin",
        password="studyflow_admin_local_only",
        connect_timeout=10,
    ) as source:
        expected = table_counts(source)
    with connect(config) as target:
        if table_counts(target) != expected:
            raise RuntimeError("Table counts differ")
        isolation = target.execute(
            "SELECT NOT has_schema_privilege('studyflow_app','ai','USAGE') AND NOT has_schema_privilege('studyflow_ai','app','USAGE')"
        ).fetchone()[0]
        if not isolation:
            raise RuntimeError("Role isolation failed")
    for role, key, schema in (
        ("studyflow_app", "SUPABASE_APP_PASSWORD", "app"),
        ("studyflow_ai", "SUPABASE_AI_PASSWORD", "ai"),
    ):
        user = role + "." + config.username.split(".", 1)[1]
        with psycopg.connect(
            host=config.host,
            port=5432,
            dbname=config.database,
            user=user,
            password=values[key],
            sslmode="require",
            connect_timeout=12,
        ) as service:
            if service.execute("SELECT current_user").fetchone()[0] != role:
                raise RuntimeError("Unexpected service role")
            if schema == "ai":
                row = service.execute(
                    "SELECT count(*) FROM ai.document_chunks WHERE (embedding <=> embedding)=0"
                ).fetchone()
                vectors = int(row[0])
            else:
                service.execute("SELECT count(*) FROM app.users").fetchone()
    result: dict[str, int | str | bool] = {
        "tables": len(expected),
        "rows": sum(expected.values()),
        "role_isolation": True,
        "runtime_roles": "OK",
        "vectors": vectors,
    }
    marker = path.resolve().parent / ".runtime" / "supabase-copy-complete.json"
    marker.write_text(
        json.dumps(
            {
                "host": config.host,
                **result,
                "verified_at": datetime.now(UTC).isoformat(),
            }
        ),
        encoding="utf-8",
    )
    return result


def main() -> int:
    """Args: --config. Returns: exit 0/1 with sanitized metadata; never raw exception messages."""
    parser = argparse.ArgumentParser(
        description="Verify copied tables and isolated runtime roles"
    )
    parser.add_argument("--config", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.config)))
        return 0
    except Exception as error:  # noqa: BLE001 - CLI output must not expose private connection values.
        print(
            json.dumps({"verification": "FAILED", "error_type": type(error).__name__})
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
