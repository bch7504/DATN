"""Trace, bounded telemetry, and retry policy checks using only synthetic inputs."""

import httpx
import pytest
from fastapi import FastAPI
from openai import APIConnectionError

from app.core.observability import RequestMetrics
from app.core.request_id import safe_request_id
from app.pipelines.parsers.pdf import PdfProcessingError
from app.workers.documents import retryable_index_error, safe_index_error_code


@pytest.mark.anyio
async def test_trace_header_and_metrics_never_record_user_path_or_query(
    application: FastAPI,
    valid_headers: dict[str, str],
) -> None:
    """Unknown URL data must not become metric labels or increase label cardinality."""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=application), base_url="http://test"
    ) as client:
        valid = await client.get("/internal/v1/health", headers=valid_headers)
        await client.get("/synthetic-sensitive-path?prompt=synthetic-only", headers=valid_headers)
    assert valid.headers["X-Request-Id"] == valid_headers["X-Request-Id"]
    metrics = application.state.request_metrics
    assert isinstance(metrics, RequestMetrics)
    routes = {sample.route for sample in metrics.snapshot()}
    assert len(routes) == 2
    assert "UNMATCHED" in routes
    assert any(route.endswith("/health") for route in routes)
    assert all(sample.total_milliseconds >= 0 for sample in metrics.snapshot())


@pytest.mark.parametrize("status,expected", [(403, False), (400, False), (429, True), (503, True)])
def test_only_transient_document_transport_errors_retry(status: int, expected: bool) -> None:
    """Invalid/expired signed URL requests cannot loop like transient provider failures."""
    request = httpx.Request("GET", "https://storage.invalid/synthetic")
    error = httpx.HTTPStatusError(
        "synthetic", request=request, response=httpx.Response(status, request=request)
    )
    assert retryable_index_error(error) is expected
    assert not retryable_index_error(PdfProcessingError(code="PDF_INVALID", message="Invalid PDF"))


def test_index_error_codes_identify_safe_failure_stage() -> None:
    """The worker exposes only stable stage codes, never exception details."""

    request = httpx.Request("GET", "https://storage.example/document.pdf")
    download_error = httpx.ConnectError("sensitive transport detail", request=request)
    provider_error = APIConnectionError(request=request)

    assert safe_index_error_code(download_error) == "DOCUMENT_DOWNLOAD_FAILED"
    assert safe_index_error_code(provider_error) == "EMBEDDING_PROVIDER_FAILED"
    assert (
        safe_index_error_code(PdfProcessingError(code="PDF_INVALID", message="Invalid PDF"))
        == "PDF_INVALID"
    )


@pytest.mark.anyio
async def test_invalid_trace_header_is_not_echoed_in_error_body_or_headers(
    application: FastAPI, valid_headers: dict[str, str]
) -> None:
    """Args: fixture app/headers. Returns: None. Raises: AssertionError on raw header echo."""
    unsafe = "synthetic value with spaces"
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=application), base_url="http://test"
    ) as client:
        result = await client.get(
            "/internal/v1/health", headers={**valid_headers, "X-Request-Id": unsafe}
        )
    assert result.status_code == 422
    assert unsafe not in result.text
    assert "requestId" not in result.json()["error"]
    assert "X-Request-Id" not in result.headers


@pytest.mark.parametrize("value", [None, "", "a", "x" * 129, "trace\nmalformed", "trace space"])
def test_invalid_trace_values_are_discarded(value: str | None) -> None:
    """Args: untrusted synthetic ID. Returns: None. Raises: AssertionError on acceptance."""
    assert safe_request_id(value) is None
