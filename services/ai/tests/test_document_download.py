"""Tests for bounded signed-URL document downloads."""

import httpx
import pytest

from app.clients.http_document_download import HttpDocumentDownloadClient


def _response(request: httpx.Request) -> httpx.Response:
    """Return a small synthetic PDF response.

    Args:
        request: Request received by the in-memory transport.

    Returns:
        Synthetic successful response.

    Raises:
        None.
    """

    return httpx.Response(
        status_code=200,
        headers={"content-type": "application/pdf"},
        content=b"%PDF-synthetic",
        request=request,
    )


@pytest.mark.anyio
async def test_downloader_returns_https_content_within_limit() -> None:
    """Confirm bounded HTTPS content is returned without transformation."""

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(_response))
    downloader = HttpDocumentDownloadClient(
        allowed_origin="https://storage.invalid", client=http_client
    )

    content = await downloader.download(
        signed_url="https://storage.invalid/document.pdf?signature=fake",
        max_bytes=1024,
    )

    assert content == b"%PDF-synthetic"
    await http_client.aclose()


@pytest.mark.anyio
async def test_downloader_rejects_other_origin_and_does_not_follow_redirects() -> None:
    """Restrict signed URLs to the configured storage, including redirects."""
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        """Args: request. Returns: redirect. Raises: none; records URLs."""
        calls.append(str(request.url))
        return httpx.Response(302, headers={"location": "https://elsewhere.invalid/private"})

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler), follow_redirects=True
    ) as client:
        downloader = HttpDocumentDownloadClient(
            allowed_origin="https://storage.invalid", client=client
        )
        with pytest.raises(ValueError, match="outside"):
            await downloader.download(signed_url="https://elsewhere.invalid/pdf", max_bytes=10)
        with pytest.raises(httpx.HTTPStatusError):
            await downloader.download(signed_url="https://storage.invalid/pdf", max_bytes=10)
    assert calls == ["https://storage.invalid/pdf"]


@pytest.mark.anyio
async def test_downloader_rejects_non_https_url_before_transport() -> None:
    """Confirm plain HTTP signed URLs fail before a request is made."""

    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        """Count unexpected requests.

        Args:
            request: Unexpected request value.

        Returns:
            Synthetic response.

        Raises:
            None.
        """

        nonlocal call_count
        call_count += 1
        return _response(request)

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    downloader = HttpDocumentDownloadClient(
        allowed_origin="https://storage.invalid", client=http_client
    )

    with pytest.raises(ValueError, match="must use HTTPS"):
        await downloader.download(
            signed_url="http://storage.invalid/document.pdf",
            max_bytes=1024,
        )

    assert call_count == 0
    await http_client.aclose()


@pytest.mark.anyio
async def test_downloader_allows_loopback_http_only_with_explicit_opt_in() -> None:
    """Allow local S3 development without permitting arbitrary plain HTTP origins."""

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(_response))
    downloader = HttpDocumentDownloadClient(
        allowed_origin="http://127.0.0.1:8333",
        client=http_client,
        allow_insecure_local_http=True,
    )

    content = await downloader.download(
        signed_url="http://127.0.0.1:8333/studyflow-documents/test.pdf?signature=fake",
        max_bytes=1024,
    )

    assert content == b"%PDF-synthetic"
    await http_client.aclose()


def test_downloader_never_allows_remote_plain_http() -> None:
    """Keep the development opt-in restricted to literal loopback hostnames."""

    with pytest.raises(ValueError, match="must use HTTPS"):
        HttpDocumentDownloadClient(
            allowed_origin="http://storage.internal:8333",
            allow_insecure_local_http=True,
        )


@pytest.mark.anyio
async def test_downloader_rejects_declared_oversized_content() -> None:
    """Confirm an oversized Content-Length fails without returning bytes."""

    def handler(request: httpx.Request) -> httpx.Response:
        """Return a response declaring excessive content.

        Args:
            request: Request received by the mock transport.

        Returns:
            Synthetic oversized response metadata.

        Raises:
            None.
        """

        return httpx.Response(
            status_code=200,
            headers={"content-length": "5000"},
            content=b"small",
            request=request,
        )

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    downloader = HttpDocumentDownloadClient(
        allowed_origin="https://storage.invalid", client=http_client
    )

    with pytest.raises(RuntimeError, match="exceeds maximum size"):
        await downloader.download(
            signed_url="https://storage.invalid/document.pdf",
            max_bytes=100,
        )

    await http_client.aclose()
