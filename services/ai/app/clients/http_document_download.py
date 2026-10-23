"""Bounded HTTP downloader for short-lived document URLs."""

from urllib.parse import ParseResult, urlparse

import httpx

from app.clients.document_download import DocumentDownloadClient

_LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


def validate_storage_url(
    *,
    url: str,
    allowed_origin: str,
    allow_insecure_local_http: bool = False,
) -> None:
    """Validate a signed URL against the configured private storage origin.

    Args:
        url: Absolute signed object URL supplied by Java.
        allowed_origin: Deployment-owned Object Storage origin.
        allow_insecure_local_http: Development opt-in for loopback HTTP only.

    Returns:
        None when scheme, host and port are allowed.

    Raises:
        ValueError: If either URL is malformed, crosses origin, uses userinfo,
            or attempts non-loopback HTTP.
    """

    origin = urlparse(allowed_origin)
    candidate = urlparse(url)
    _validate_absolute_storage_url(
        origin,
        label="Object Storage origin",
        allow_insecure_local_http=allow_insecure_local_http,
        require_origin_path=True,
    )
    _validate_absolute_storage_url(
        candidate,
        label="signed URL",
        allow_insecure_local_http=allow_insecure_local_http,
        require_origin_path=False,
    )
    origin_port = origin.port or (443 if origin.scheme == "https" else 80)
    candidate_port = candidate.port or (443 if candidate.scheme == "https" else 80)
    if (
        candidate.scheme.lower(),
        candidate.hostname.lower() if candidate.hostname else None,
        candidate_port,
    ) != (
        origin.scheme.lower(),
        origin.hostname.lower() if origin.hostname else None,
        origin_port,
    ):
        raise ValueError("signed URL is outside the configured Object Storage origin")


def _validate_absolute_storage_url(
    parsed: ParseResult,
    *,
    label: str,
    allow_insecure_local_http: bool,
    require_origin_path: bool,
) -> None:
    """Validate one parsed storage URL without resolving DNS.

    Args:
        parsed: urllib ParseResult produced from a configured or signed URL.
        label: Safe field label used in validation errors.
        allow_insecure_local_http: Development opt-in for loopback HTTP only.
        require_origin_path: Whether path/query/fragment must be empty like an origin.

    Returns:
        None for an allowed URL.

    Raises:
        ValueError: If URL shape or transport policy is unsafe.
    """

    scheme = parsed.scheme.lower()
    hostname = parsed.hostname.lower() if parsed.hostname else None
    if scheme not in {"http", "https"} or hostname is None:
        raise ValueError(f"{label} must be an absolute HTTP(S) URL")
    if parsed.username or parsed.password or parsed.fragment:
        raise ValueError(f"{label} cannot include userinfo or a fragment")
    if scheme == "http" and not (allow_insecure_local_http and hostname in _LOOPBACK_HOSTS):
        raise ValueError(f"{label} must use HTTPS unless loopback HTTP is explicitly enabled")
    if require_origin_path and (parsed.path not in {"", "/"} or parsed.query):
        raise ValueError("Object Storage origin cannot include a path or query")


class HttpDocumentDownloadClient(DocumentDownloadClient):
    """Stream PDF bytes without logging or persisting the signed URL."""

    def __init__(
        self,
        *,
        allowed_origin: str,
        client: httpx.AsyncClient | None = None,
        timeout_seconds: float = 30.0,
        allow_insecure_local_http: bool = False,
    ) -> None:
        """Create a non-redirecting asynchronous downloader.

        Args:
            allowed_origin: Configured HTTPS Object Storage origin trusted by deployment.
            client: Optional caller-owned client, mainly for tests.
            timeout_seconds: Overall HTTP timeout when creating an owned client.
            allow_insecure_local_http: Development opt-in for loopback HTTP only.

        Returns:
            None.

        Raises:
            ValueError: If timeout_seconds is not positive.
        """

        if timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        validate_storage_url(
            url=allowed_origin,
            allowed_origin=allowed_origin,
            allow_insecure_local_http=allow_insecure_local_http,
        )
        self._allowed_origin = allowed_origin
        self._allow_insecure_local_http = allow_insecure_local_http
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

        validate_storage_url(
            url=signed_url,
            allowed_origin=self._allowed_origin,
            allow_insecure_local_http=self._allow_insecure_local_http,
        )
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
