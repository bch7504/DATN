"""Document download contract used by the indexing worker."""

from typing import Protocol


class DocumentDownloadClient(Protocol):
    """Contract for fetching one Java-authorized signed document URL."""

    async def download(self, *, signed_url: str, max_bytes: int) -> bytes:
        """Download a document while enforcing a hard byte limit.

        Args:
            signed_url: Short-lived URL supplied by Java for this job only.
            max_bytes: Maximum number of bytes accepted by the worker.

        Returns:
            Complete file bytes no larger than max_bytes.

        Raises:
            ValueError: If URL or byte limit is invalid.
            RuntimeError: If download fails or exceeds the limit.
        """
