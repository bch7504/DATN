"""Bounded HTTP downloader for short-lived document URLs."""

from urllib.parse import urlparse

import httpx

from app.clients.document_download import DocumentDownloadClient


class HttpDocumentDownloadClient(DocumentDownloadClient):
    """Stream PDF bytes without logging or persisting the signed URL."""

    def __init__(
        self,
        *,
        allowed_origin: str,
        client: httpx.AsyncClient | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        """Create a non-redirecting asynchronous downloader.

        Args:
            allowed_origin: Configured HTTPS Object Storage origin trusted by deployment.
            client: Optional caller-owned client, mainly for tests.
            timeout_seconds: Overall HTTP timeout when creating an owned client.

        Returns:
            None.

        Raises:
            ValueError: If timeout_seconds is not positive.
        """

        if timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        origin = urlparse(allowed_origin)
        if origin.scheme != "https" or not origin.hostname or origin.username or origin.password:
            raise ValueError("Object Storage origin must be an absolute HTTPS URL")
        self._allowed_host_port = (origin.hostname, origin.port or 443)
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(
            timeout=timeout_seconds,
            follow_redirects=False,
        )

    async def close(self) -> None:
        """Close the HTTP client only when this adapter created it.

        Args:
            None.

        Returns:
            None.

        Raises:
            RuntimeError: If the underlying HTTP client cannot close.
        """

        if self._owns_client:
            await self._client.aclose()

    async def download(self, *, signed_url: str, max_bytes: int) -> bytes:
        """Stream one HTTPS resource and enforce declared and actual size.

        Args:
            signed_url: Short-lived HTTPS URL supplied by Java.
            max_bytes: Maximum accepted response size.

        Returns:
            Complete response bytes no larger than max_bytes.

        Raises:
            ValueError: If URL is not HTTPS or max_bytes is invalid.
            RuntimeError: If the response declares or streams too many bytes.
            httpx.HTTPError: If transport or HTTP status handling fails.
        """

        parsed = urlparse(signed_url)
        if parsed.scheme != "https" or not parsed.hostname:
            raise ValueError("signed_url must be an absolute HTTPS URL")
        if (parsed.hostname, parsed.port or 443) != self._allowed_host_port:
            raise ValueError("signed URL is outside the configured Object Storage origin")
        if parsed.username or parsed.password or parsed.fragment:
            raise ValueError("signed URL cannot include userinfo or a fragment")
        if max_bytes < 1:
            raise ValueError("max_bytes must be positive")

        async with self._client.stream("GET", signed_url, follow_redirects=False) as response:
            response.raise_for_status()
            declared_length = response.headers.get("content-length")
            if declared_length is not None:
                try:
                    parsed_length = int(declared_length)
                except ValueError as error:
                    raise RuntimeError("download returned an invalid content length") from error
                if parsed_length > max_bytes:
                    raise RuntimeError("download exceeds maximum size")

            content = bytearray()
            async for block in response.aiter_bytes():
                content.extend(block)
                if len(content) > max_bytes:
                    raise RuntimeError("download exceeds maximum size")
        return bytes(content)
