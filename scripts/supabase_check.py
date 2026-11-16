"""Read-only Supabase preflight using one explicitly authorized private config file.

CLI args: --config PATH (required dotenv path; no automatic discovery).
Input: configured Supabase session-pooler credentials and private S3 bucket credentials.
Output: sanitized JSON statuses and schema/table counts, never credential values.
Exit: 0 when database and bucket checks pass; 1 on connection failure; 2 on invalid input.
Side effects: read-only database queries and signed S3 HEAD; no retry or data migration.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote, urlsplit

import httpx
import psycopg
from dotenv import dotenv_values


@dataclass(frozen=True)
class ConnectionConfig:
    """Validated connection inputs; sensitive values are excluded from representations."""

    host: str
    port: int
    database: str
    username: str
    password: str = field(repr=False)
    endpoint: str
    region: str
    bucket: str
    access_key: str = field(repr=False)
    secret_key: str = field(repr=False)


def load_config(path: Path) -> ConnectionConfig:
    """Args: explicit existing dotenv path. Returns: validated config without interpolation.
    Raises: ValueError for missing/invalid fields, OSError when the file is unavailable.
    No automatic environment loading, network requests or value logging occurs.
    """
    values = dotenv_values(path, interpolate=False, encoding="utf-8-sig")
    keys = (
        "SUPABASE_DB_HOST",
        "SUPABASE_DB_PORT",
        "SUPABASE_DB_NAME",
        "SUPABASE_DB_USER",
        "SUPABASE_DB_PASSWORD",
        "STORAGE_ENDPOINT",
        "STORAGE_REGION",
        "STORAGE_BUCKET",
        "STORAGE_ACCESS_KEY",
        "STORAGE_SECRET_KEY",
    )
    if any(not values.get(key) for key in keys):
        raise ValueError("Required connection fields are missing")
    clean = {key: str(values[key]) for key in keys}
    endpoint = urlsplit(clean["STORAGE_ENDPOINT"])
    if (
        not re.fullmatch(r"[a-z0-9.-]+\.supabase\.com", clean["SUPABASE_DB_HOST"])
        or int(clean["SUPABASE_DB_PORT"]) != 5432
        or endpoint.scheme != "https"
        or not endpoint.hostname
        or not endpoint.hostname.endswith(".storage.supabase.co")
        or endpoint.username
        or endpoint.password
        or endpoint.query
        or endpoint.fragment
        or endpoint.path.rstrip("/") != "/storage/v1/s3"
        or not re.fullmatch(r"[a-z0-9-]+", clean["STORAGE_BUCKET"])
        or not re.fullmatch(r"[a-z0-9-]+", clean["STORAGE_REGION"])
    ):
        raise ValueError("Unsupported Supabase target")
    return ConnectionConfig(
        clean["SUPABASE_DB_HOST"],
        5432,
        clean["SUPABASE_DB_NAME"],
        clean["SUPABASE_DB_USER"],
        clean["SUPABASE_DB_PASSWORD"],
        clean["STORAGE_ENDPOINT"].rstrip("/"),
        clean["STORAGE_REGION"],
        clean["STORAGE_BUCKET"],
        clean["STORAGE_ACCESS_KEY"],
        clean["STORAGE_SECRET_KEY"],
    )


def signed_headers(
    config: ConnectionConfig,
    method: str,
    path: str,
    payload: bytes = b"",
    timestamp: datetime | None = None,
    query: Mapping[str, str] | None = None,
) -> dict[str, str]:
    """Args: config, uppercase HTTP method, decoded absolute S3 path, body bytes (default empty),
    optional UTC timestamp (default now), query parameters (default empty).
    Returns: AWS SigV4 headers; no I/O.
    Raises: ValueError for a non-absolute path. Headers must never be logged.
    """
    if not path.startswith("/"):
        raise ValueError("Absolute S3 path required")
    now = timestamp or datetime.now(UTC)
    date, amz_date = now.strftime("%Y%m%d"), now.strftime("%Y%m%dT%H%M%SZ")
    host = urlsplit(config.endpoint).netloc
    digest = hashlib.sha256(payload).hexdigest()
    names = "host;x-amz-content-sha256;x-amz-date"
    canonical_query = "&".join(
        f"{quote(k, safe='~')}={quote(v, safe='~')}"
        for k, v in sorted((query or {}).items())
    )
    canonical = (
        f"{method}\n{quote(path, safe='/~')}\n{canonical_query}\n"
        f"host:{host}\nx-amz-content-sha256:{digest}\nx-amz-date:{amz_date}\n\n{names}\n{digest}"
    )
    scope = f"{date}/{config.region}/s3/aws4_request"
    message = f"AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n{hashlib.sha256(canonical.encode()).hexdigest()}"
    key = ("AWS4" + config.secret_key).encode()
    for part in (date, config.region, "s3", "aws4_request"):
        key = hmac.new(key, part.encode(), hashlib.sha256).digest()
    signature = hmac.new(key, message.encode(), hashlib.sha256).hexdigest()
    return {
        "Host": host,
        "x-amz-date": amz_date,
        "x-amz-content-sha256": digest,
        "Authorization": f"AWS4-HMAC-SHA256 Credential={config.access_key}/{scope}, SignedHeaders={names}, Signature={signature}",
    }


def check(config: ConnectionConfig) -> dict[str, str | int]:
    """Args: validated authorized config. Returns: sanitized read-only DB/S3 result fields.
    Errors: connection/HTTP errors become status fields; no raw exception or response bodies escape.
    Side effects: SELECT metadata and S3 HEAD only, each bounded by a timeout.
    """
    result: dict[str, str | int] = {}
    try:
        with psycopg.connect(
            host=config.host,
            port=config.port,
            dbname=config.database,
            user=config.username,
            password=config.password,
            sslmode="require",
            connect_timeout=12,
            options="-c statement_timeout=15000",
        ) as conn:
            row = conn.execute(
                "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('app','ai')"
            ).fetchone()
            result.update(database="OK", application_tables=int(row[0]) if row else 0)
            result["postgres_version"] = conn.info.server_version
            extension = conn.execute(
                "SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='vector'"
            ).fetchone()
            result["vector_schema"] = (
                str(extension[0]) if extension else "NOT_INSTALLED"
            )
            bucket = conn.execute(
                "SELECT public FROM storage.buckets WHERE id=%s", (config.bucket,)
            ).fetchone()
            result["bucket_private"] = "YES" if bucket and not bucket[0] else "NO"
    except (psycopg.Error, OSError, ValueError) as error:
        result["database"] = "FAILED"
        result["database_error_type"] = type(error).__name__
        if isinstance(error, psycopg.Error) and error.sqlstate:
            result["database_sqlstate"] = error.sqlstate
    try:
        path = urlsplit(config.endpoint).path + "/" + config.bucket
        response = httpx.head(
            config.endpoint + "/" + config.bucket,
            headers=signed_headers(config, "HEAD", path),
            timeout=20,
            follow_redirects=False,
        )
        result["storage_http"] = response.status_code
        result["storage"] = "OK" if response.status_code == 200 else "FAILED"
    except (httpx.HTTPError, ValueError) as error:
        result["storage"] = "FAILED"
        result["storage_error_type"] = type(error).__name__
    return result


def main() -> int:
    """Args: CLI --config path. Returns: exit 0/1/2, prints sanitized JSON only.
    Errors: bad config/file emits generic status; database/storage errors are handled by check.
    """
    parser = argparse.ArgumentParser(description="Read-only Supabase connection check")
    parser.add_argument("--config", type=Path, required=True)
    args = parser.parse_args()
    try:
        config = load_config(args.config)
    except (ValueError, OSError):
        print(json.dumps({"configuration": "INVALID_OR_UNAVAILABLE"}))
        return 2
    result = check(config)
    print(json.dumps(result))
    return 0 if result.get("database") == result.get("storage") == "OK" else 1


if __name__ == "__main__":
    raise SystemExit(main())
