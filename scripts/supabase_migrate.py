"""Copy quiescent local StudyFlow data to an empty Supabase application database.

Args: --config PATH required, --apply required to perform a copy. Input: authorized private
config; local Docker postgres/S3 running, Java and AI workers stopped, empty target app/ai.
Output: aggregate JSON progress and a private configuration extended with separate runtime
role passwords. Exit 0 success / 1 sanitized failure. No automatic retry; objects with
identical bytes may be reused on a manual retry, differing objects are never overwritten.
Side effects: target role/schema setup, verified S3 copies, one-transaction pg_restore;
source never modified/deleted. Archive retained in ignored .runtime as recovery snapshot.
Uses existing AI dev packages; no new production dependency. Never emits raw DB/HTTP errors.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import secrets
import subprocess
import xml.etree.ElementTree as ET
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote, urlencode, urlsplit

import httpx
import psycopg
from dotenv import dotenv_values, set_key
from psycopg import sql
from supabase_check import ConnectionConfig, load_config, signed_headers


def emit(stage: str, **counts: int | str) -> None:
    """Args: safe stage label and aggregate counts. Returns: None; prints flushed JSON only."""
    print(json.dumps({"stage": stage, **counts}), flush=True)


def connect(config: ConnectionConfig) -> psycopg.Connection:
    """Args: validated target config. Returns: TLS DB connection. Raises: psycopg connection errors."""
    return psycopg.connect(
        host=config.host,
        port=config.port,
        dbname=config.database,
        user=config.username,
        password=config.password,
        sslmode="require",
        connect_timeout=15,
        options="-c statement_timeout=120000",
    )


def object_request(
    client: httpx.Client,
    config: ConnectionConfig,
    method: str,
    key: str = "",
    payload: bytes = b"",
    query: dict[str, str] | None = None,
    content_type: str | None = None,
) -> httpx.Response:
    """Args: client/config, S3 method, object key (empty=bucket), body/query/MIME optional.
    Returns: bounded HTTP response. Raises: RuntimeError with safe HTTP status only.
    Side effects: specified S3 operation; no redirect, URL/header/body logging or retry.
    """
    path = urlsplit(config.endpoint).path.rstrip("/") + "/" + config.bucket
    if key:
        path += "/" + key
    headers = signed_headers(config, method, path, payload, query=query)
    if content_type:
        headers["Content-Type"] = content_type
    url = f"{urlsplit(config.endpoint).scheme}://{urlsplit(config.endpoint).netloc}{quote(path, safe='/~')}"
    if query:
        url += "?" + urlencode(query, quote_via=quote, safe="~")
    response = client.request(
        method, url, headers=headers, content=payload, follow_redirects=False
    )
    if response.status_code not in (200, 204, 404):
        raise RuntimeError(f"S3 operation failed HTTP {response.status_code}")
    return response


def list_objects(client: httpx.Client, config: ConnectionConfig) -> dict[str, int]:
    """Args: client and endpoint credentials. Returns: object-key/size manifest in memory only.
    Raises: RuntimeError on S3 failure or malformed pagination; performs paginated GET metadata.
    """
    result: dict[str, int] = {}
    token = ""
    for _ in range(10000):
        query = {"list-type": "2", "max-keys": "1000"}
        if token:
            query["continuation-token"] = token
        response = object_request(client, config, "GET", query=query)
        if response.status_code != 200:
            raise RuntimeError("Bucket unavailable")
        root = ET.fromstring(response.content)
        ns = {"s": "http://s3.amazonaws.com/doc/2006-03-01/"}
        for item in root.findall("s:Contents", ns):
            key, size = (
                item.findtext("s:Key", namespaces=ns),
                item.findtext("s:Size", namespaces=ns),
            )
            if key is None or size is None:
                raise RuntimeError("Invalid object manifest")
            result[key] = int(size)
        if root.findtext("s:IsTruncated", namespaces=ns) != "true":
            return result
        next_token = root.findtext("s:NextContinuationToken", namespaces=ns)
        if not next_token or next_token == token:
            raise RuntimeError("Invalid S3 pagination")
        token = next_token
    raise RuntimeError("S3 manifest limit exceeded")


def table_counts(conn: psycopg.Connection) -> dict[str, int]:
    """Args: DB connection. Returns: exact app/ai table counts, no row content. Raises: DB errors."""
    tables = conn.execute(
        "SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('app','ai') ORDER BY 1,2"
    ).fetchall()
    return {
        f"{schema}.{table}": int(
            conn.execute(
                sql.SQL("SELECT count(*) FROM {}.{}").format(
                    sql.Identifier(schema), sql.Identifier(table)
                )
            ).fetchone()[0]
        )
        for schema, table in tables
    }


def runtime_values(config_path: Path, config: ConnectionConfig) -> dict[str, str]:
    """Args: authorized private config path and target. Returns: generated/reused runtime settings.
    Side effects: appends missing private role/token settings, never prints them; preserves existing keys.
    Raises: file/validation errors. Reuses passwords so interrupted provisioning is restartable.
    """
    existing = dotenv_values(config_path, interpolate=False, encoding="utf-8-sig")
    generated = {
        name: existing.get(name) or secrets.token_urlsafe(36)
        for name in (
            "SUPABASE_APP_PASSWORD",
            "SUPABASE_AI_PASSWORD",
            "JWT_SECRET",
            "INTERNAL_SERVICE_TOKEN",
        )
    }
    project_ref = config.username.split(".", 1)[1]
    result = {
        **generated,
        "DATABASE_URL": f"jdbc:postgresql://{config.host}:5432/{config.database}?sslmode=require&currentSchema=app",
        "DATABASE_USERNAME": f"studyflow_app.{project_ref}",
        "DATABASE_PASSWORD": generated["SUPABASE_APP_PASSWORD"],
        "AI_DATABASE_URL": f"postgresql+psycopg://studyflow_ai.{project_ref}:{quote(generated['SUPABASE_AI_PASSWORD'], safe='')}@{config.host}:5432/{config.database}?sslmode=require",
        "AI_SERVICE_TOKEN": generated["INTERNAL_SERVICE_TOKEN"],
        "SPRING_FLYWAY_ENABLED": "false",
        "STUDYFLOW_LOCAL_TEACHER_ACCOUNTS_ENABLED": "false",
        "STUDYFLOW_LOCAL_STUDENT_ACCOUNTS_ENABLED": "false",
        "AI_ALLOW_INSECURE_LOCAL_STORAGE_URL": "false",
        "STORAGE_ENABLED": "true",
    }
    for key, value in result.items():
        set_key(str(config_path), key, value, quote_mode="always")
    return result


def migrate(config_path: Path) -> None:
    """Args: authorized config path. Returns: None on verified copy.
    Preconditions: local writers stopped, no pending index jobs, target application tables empty.
    Side effects and rollback: see module contract; pg_restore is transactional, source is retained.
    Raises: validation, DB, file or safe S3/subprocess errors; caller emits sanitized stage failure.
    """
    config = load_config(config_path)
    with connect(config) as target:
        if table_counts(target):
            raise RuntimeError(
                "Target application tables are not empty; refusing replacement"
            )
        bucket = target.execute(
            "SELECT public FROM storage.buckets WHERE id=%s", (config.bucket,)
        ).fetchone()
        if not bucket or bucket[0]:
            raise RuntimeError("Target bucket must exist and be private")
        vector = target.execute(
            "SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='vector'"
        ).fetchone()
        if vector and vector[0] != "public":
            raise RuntimeError(
                "Existing pgvector schema differs from local; manual compatibility work required"
            )
    source_storage = replace(
        config,
        endpoint="http://127.0.0.1:8333",
        region="us-east-1",
        access_key="studyflow_storage_local_access",
        secret_key="studyflow_storage_local_secret",
    )
    with psycopg.connect(
        host="127.0.0.1",
        port=5433,
        dbname="studyflow",
        user="studyflow_admin",
        password="studyflow_admin_local_only",
        connect_timeout=10,
    ) as source:
        pending = source.execute(
            "SELECT count(*) FROM ai.index_jobs WHERE status IN ('PENDING','RUNNING','PROCESSING','QUEUED')"
        ).fetchone()[0]
        if pending:
            raise RuntimeError("Pending index jobs must finish before copying")
        expected = table_counts(source)
    snapshot = (
        config_path.parent
        / ".runtime"
        / ("supabase-source-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ") + ".dump")
    )
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    with snapshot.open("wb") as archive:
        dump = subprocess.run(
            [
                "docker",
                "exec",
                "studyflow-postgres",
                "pg_dump",
                "-U",
                "studyflow_admin",
                "-d",
                "studyflow",
                "-Fc",
                "--schema=app",
                "--schema=ai",
                "--no-owner",
                "--no-acl",
            ],
            stdout=archive,
            stderr=subprocess.PIPE,
            check=False,
            timeout=180,
        )
    if dump.returncode:
        raise RuntimeError("Source snapshot failed; raw output suppressed")
    emit(
        "source_snapshot",
        tables=len(expected),
        rows=sum(expected.values()),
        archive_bytes=snapshot.stat().st_size,
    )
    with httpx.Client(timeout=90) as client:
        manifest = list_objects(client, source_storage)
        destination = list_objects(client, config)
        if set(destination) - set(manifest):
            raise RuntimeError("Target has unrelated objects; refusing to merge")
        if (
            sum(manifest.values()) > 900_000_000
            or max(manifest.values(), default=0) > 50_000_000
        ):
            raise RuntimeError("Source exceeds planned Free storage limits")
        emit("object_manifest", objects=len(manifest), bytes=sum(manifest.values()))
        for index, (key, size) in enumerate(manifest.items(), 1):
            original = object_request(client, source_storage, "GET", key)
            if original.status_code != 200 or len(original.content) != size:
                raise RuntimeError("Source object size changed")
            before = (
                object_request(client, config, "GET", key)
                if key in destination
                else None
            )
            if before is not None and before.content != original.content:
                raise RuntimeError("Target object differs; refusing overwrite")
            if before is None:
                object_request(
                    client,
                    config,
                    "PUT",
                    key,
                    original.content,
                    content_type=original.headers.get(
                        "content-type", "application/octet-stream"
                    ),
                )
            restored = object_request(client, config, "GET", key)
            if (
                restored.status_code != 200
                or hashlib.sha256(restored.content).digest()
                != hashlib.sha256(original.content).digest()
            ):
                raise RuntimeError("Target object verification failed")
            if index % 10 == 0 or index == len(manifest):
                emit("objects_verified", completed=index, total=len(manifest))
        if list_objects(client, config) != manifest:
            raise RuntimeError("Final object manifest differs")
    values = runtime_values(config_path, config)
    with connect(config) as target:
        target.execute("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public")
        for role, password_key in (
            ("studyflow_app", "SUPABASE_APP_PASSWORD"),
            ("studyflow_ai", "SUPABASE_AI_PASSWORD"),
        ):
            exists = target.execute(
                "SELECT 1 FROM pg_roles WHERE rolname=%s", (role,)
            ).fetchone()
            if not exists:
                target.execute(
                    sql.SQL("CREATE ROLE {} LOGIN PASSWORD {}").format(
                        sql.Identifier(role), sql.Literal(values[password_key])
                    )
                )
            else:
                raise RuntimeError(
                    "Runtime role already exists; refusing password replacement"
                )
            target.execute(
                sql.SQL(
                    "ALTER ROLE {} IN DATABASE {} SET search_path TO {}, public"
                ).format(
                    sql.Identifier(role),
                    sql.Identifier(config.database),
                    sql.Identifier("app" if role == "studyflow_app" else "ai"),
                )
            )
    env = dict(os.environ, PGPASSWORD=config.password, PGSSLMODE="require")
    with snapshot.open("rb") as archive:
        restore = subprocess.run(
            [
                "docker",
                "exec",
                "-i",
                "-e",
                "PGPASSWORD",
                "-e",
                "PGSSLMODE",
                "studyflow-postgres",
                "pg_restore",
                "--host",
                config.host,
                "--port",
                "5432",
                "--username",
                config.username,
                "--dbname",
                config.database,
                "--single-transaction",
                "--no-owner",
                "--no-acl",
                "--exit-on-error",
            ],
            stdin=archive,
            capture_output=True,
            env=env,
            check=False,
            timeout=300,
        )
    if restore.returncode:
        raise RuntimeError(
            "Target restore failed; transaction rolled back; raw output suppressed"
        )
    with connect(config) as target:
        for schema, role in (("app", "studyflow_app"), ("ai", "studyflow_ai")):
            target.execute(
                sql.SQL(
                    "REVOKE ALL ON SCHEMA {} FROM PUBLIC, anon, authenticated"
                ).format(sql.Identifier(schema))
            )
            target.execute(
                sql.SQL(
                    "REVOKE ALL ON ALL TABLES IN SCHEMA {} FROM PUBLIC, anon, authenticated"
                ).format(sql.Identifier(schema))
            )
            target.execute(
                sql.SQL("GRANT USAGE ON SCHEMA {} TO {}").format(
                    sql.Identifier(schema), sql.Identifier(role)
                )
            )
            target.execute(
                sql.SQL(
                    "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA {} TO {}"
                ).format(sql.Identifier(schema), sql.Identifier(role))
            )
            target.execute(
                sql.SQL(
                    "GRANT USAGE,SELECT,UPDATE ON ALL SEQUENCES IN SCHEMA {} TO {}"
                ).format(sql.Identifier(schema), sql.Identifier(role))
            )
        actual = table_counts(target)
        if actual != expected:
            raise RuntimeError("Restored table counts differ")
    emit("database_verified", tables=len(expected), rows=sum(expected.values()))
    marker = config_path.parent / ".runtime" / "supabase-copy-complete.json"
    marker.write_text(
        json.dumps(
            {
                "host": config.host,
                "tables": len(expected),
                "rows": sum(expected.values()),
                "verified_at": datetime.now(UTC).isoformat(),
            }
        ),
        encoding="utf-8",
    )
    emit(
        "migration_copy_complete",
        source="retained",
        runtime="restart_and_acceptance_pending",
    )


def main() -> int:
    """Args: --config and explicit --apply. Returns: exit 0/1; safe progress JSON only.
    Errors: raw exceptions are suppressed, no credentials/row contents enter console output.
    """
    parser = argparse.ArgumentParser(
        description="Copy local app/ai and S3 data to empty Supabase"
    )
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--apply", action="store_true", required=True)
    args = parser.parse_args()
    try:
        migrate(args.config.resolve())
        return 0
    except Exception as error:  # noqa: BLE001 - CLI boundary must suppress secret-bearing driver errors.
        emit("FAILED", error_type=type(error).__name__)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
