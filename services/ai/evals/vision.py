"""Safe live Vision evaluation over explicitly authorized local course PDFs."""

import asyncio
from pathlib import Path

from pydantic import BaseModel, Field

from app.clients.openrouter import OpenRouterClient
from app.clients.protocols import VisionCaptionClient
from app.core.config import Settings
from app.pipelines.parsers.pdf import PdfProcessingError
from app.pipelines.parsers.pdf_multimodal import parse_pdf_multimodal


class VisionDocumentResult(BaseModel):
    """Content-free processing metrics for one authorized PDF."""

    file_name: str
    status: str = Field(pattern="^(PASSED|FAILED)$")
    page_count: int = Field(ge=0)
    extracted_page_count: int = Field(ge=0)
    provider_calls: int = Field(ge=0)
    successful_captions: int = Field(ge=0)
    failed_captions: int = Field(ge=0)
    layout_block_count: int = Field(ge=0)
    table_count: int = Field(ge=0)
    latex_page_count: int = Field(ge=0)
    error_code: str | None = None


class LiveVisionReport(BaseModel):
    """Aggregate report without PDF text, prompts, captions, URLs, or secrets."""

    model: str
    document_count: int = Field(ge=0)
    page_count: int = Field(ge=0)
    provider_calls: int = Field(ge=0)
    successful_captions: int = Field(ge=0)
    failed_captions: int = Field(ge=0)
    layout_block_count: int = Field(ge=0)
    table_count: int = Field(ge=0)
    latex_page_count: int = Field(ge=0)
    passed: bool
    documents: tuple[VisionDocumentResult, ...]


class _TrackingVisionClient:
    """Count Vision outcomes while keeping provider content inside the parser call."""

    def __init__(self, delegate: VisionCaptionClient) -> None:
        self._delegate = delegate
        self.calls = 0
        self.successes = 0
        self.failures = 0
        self.error_codes: list[str] = []

    async def describe_image(
        self,
        *,
        image_bytes: bytes,
        mime_type: str = "image/png",
        context: str = "",
    ) -> str:
        """Delegate one page render and count only its outcome.

        Args:
            image_bytes: Bounded whole-page PNG bytes.
            mime_type: Image media type supplied by the parser.
            context: Bounded text-layer context for this page.

        Returns:
            Provider caption used transiently by the parser.

        Raises:
            RuntimeError: If the provider rejects or fails the request.
        """

        self.calls += 1
        try:
            caption = await self._delegate.describe_image(
                image_bytes=image_bytes,
                mime_type=mime_type,
                context=context,
            )
        except Exception as error:
            self.failures += 1
            self.error_codes.append(_safe_provider_error_code(error))
            raise
        self.successes += 1
        return caption


async def evaluate_vision_documents(
    *,
    document_dir: Path,
    vision_client: VisionCaptionClient,
    vision_model: str,
    file_pattern: str = "*.pdf",
    max_files: int = 20,
    max_vision_pages_per_document: int = 100,
    max_concurrent_documents: int = 4,
) -> LiveVisionReport:
    """Evaluate page-level Vision extraction on explicitly authorized PDFs.

    Args:
        document_dir: Existing directory containing authorized course PDF files.
        vision_client: Provider adapter implementing the bounded Vision contract.
        vision_model: Non-secret model identifier included in the report.
        file_pattern: File-name-only glob ending in `.pdf`.
        max_files: Maximum number of sorted PDF files accepted in one run.
        max_vision_pages_per_document: Maximum provider calls allowed per PDF.
        max_concurrent_documents: Maximum PDFs processed concurrently.

    Returns:
        Content-free per-document and aggregate processing metrics.

    Raises:
        ValueError: If the directory or limits are invalid, or it contains no PDFs.
        OSError: If an authorized PDF cannot be read.
    """

    if not document_dir.is_dir():
        raise ValueError("document_dir must be an existing directory")
    if (
        not file_pattern.lower().endswith(".pdf")
        or ".." in file_pattern
        or "/" in file_pattern
        or "\\" in file_pattern
    ):
        raise ValueError("file_pattern must be a PDF file-name glob without directories")
    if not 1 <= max_files <= 100:
        raise ValueError("max_files must be between 1 and 100")
    if not 1 <= max_vision_pages_per_document <= 500:
        raise ValueError("max_vision_pages_per_document must be between 1 and 500")
    if not 1 <= max_concurrent_documents <= 8:
        raise ValueError("max_concurrent_documents must be between 1 and 8")
    files = tuple(sorted(document_dir.glob(file_pattern)))
    if not files:
        raise ValueError("document_dir contains no PDF files")
    if len(files) > max_files:
        raise ValueError("document_dir exceeds max_files; narrow the authorized directory")

    async def evaluate_file(file_path: Path) -> VisionDocumentResult:
        """Process one authorized file and discard extracted content after metrics.

        Args:
            file_path: PDF directly contained by the authorized directory.

        Returns:
            Content-free metrics for this file.

        Raises:
            OSError: If the authorized PDF cannot be read.
        """

        tracker = _TrackingVisionClient(vision_client)
        try:
            parsed = await parse_pdf_multimodal(
                file_path.read_bytes(),
                max_bytes=20 * 1024 * 1024,
                max_pages=500,
                max_vision_pages=max_vision_pages_per_document,
                vision_client=tracker,
            )
            captioned_pages = sum(page.vision_status == "CAPTIONED" for page in parsed.pages)
            fallback_pages = sum(page.vision_status == "FAILED" for page in parsed.pages)
            status = "PASSED" if fallback_pages == 0 and captioned_pages > 0 else "FAILED"
            return VisionDocumentResult(
                file_name=file_path.name,
                status=status,
                page_count=parsed.page_count,
                extracted_page_count=len(parsed.pages),
                provider_calls=tracker.calls,
                successful_captions=captioned_pages,
                failed_captions=fallback_pages,
                layout_block_count=sum(page.layout_block_count for page in parsed.pages),
                table_count=sum(page.table_count for page in parsed.pages),
                latex_page_count=sum(page.contains_latex for page in parsed.pages),
                error_code=(
                    None
                    if status == "PASSED"
                    else _single_error_code(tracker.error_codes)
                    or ("VISION_CAPTION_REJECTED" if fallback_pages else "VISION_NO_VISUAL_PAGES")
                ),
            )
        except PdfProcessingError as error:
            return VisionDocumentResult(
                file_name=file_path.name,
                status="FAILED",
                page_count=0,
                extracted_page_count=0,
                provider_calls=tracker.calls,
                successful_captions=tracker.successes,
                failed_captions=tracker.failures,
                layout_block_count=0,
                table_count=0,
                latex_page_count=0,
                error_code=_single_error_code(tracker.error_codes) or error.code,
            )

    semaphore = asyncio.Semaphore(max_concurrent_documents)

    async def evaluate_bounded(file_path: Path) -> VisionDocumentResult:
        """Apply the document-level concurrency limit to one evaluation.

        Args:
            file_path: PDF directly contained by the authorized directory.

        Returns:
            Content-free metrics for this file.

        Raises:
            OSError: If the authorized PDF cannot be read.
        """

        async with semaphore:
            return await evaluate_file(file_path)

    documents = tuple(await asyncio.gather(*(evaluate_bounded(path) for path in files)))
    return LiveVisionReport(
        model=vision_model,
        document_count=len(documents),
        page_count=sum(item.page_count for item in documents),
        provider_calls=sum(item.provider_calls for item in documents),
        successful_captions=sum(item.successful_captions for item in documents),
        failed_captions=sum(item.failed_captions for item in documents),
        layout_block_count=sum(item.layout_block_count for item in documents),
        table_count=sum(item.table_count for item in documents),
        latex_page_count=sum(item.latex_page_count for item in documents),
        passed=all(item.status == "PASSED" for item in documents),
        documents=documents,
    )


async def run_live_vision_evaluation(
    *,
    document_dir: Path,
    file_pattern: str = "*.pdf",
    max_files: int = 20,
    max_vision_pages_per_document: int = 100,
) -> LiveVisionReport:
    """Run real OpenRouter Vision evaluation without exposing document content.

    Args:
        document_dir: Explicit local directory authorized by the user for this run.
        file_pattern: File-name-only glob selecting authorized PDFs in that directory.
        max_files: Maximum accepted number of PDFs.
        max_vision_pages_per_document: Maximum page-level provider calls per PDF.

    Returns:
        Content-free live Vision report.

    Raises:
        ValueError: If OpenRouter configuration or arguments are missing/invalid.
        RuntimeError: If provider initialization fails.
        OSError: If an authorized PDF cannot be read.
    """

    settings = Settings(INTERNAL_SERVICE_TOKEN="live-vision-evaluation-token")
    if settings.openrouter_api_key is None:
        raise ValueError("OPENROUTER_API_KEY must be configured in root .env or the process")
    provider = OpenRouterClient.from_settings(settings)
    try:
        return await evaluate_vision_documents(
            document_dir=document_dir,
            vision_client=provider,
            vision_model=settings.openrouter_vision_model,
            file_pattern=file_pattern,
            max_files=max_files,
            max_vision_pages_per_document=max_vision_pages_per_document,
        )
    finally:
        await provider.close()


def _safe_provider_error_code(error: Exception) -> str:
    """Map a provider exception chain to a stable code without exposing its message.

    Args:
        error: Exception raised by the Vision adapter or provider SDK.

    Returns:
        Stable non-sensitive error code suitable for evaluation output.

    Raises:
        None.
    """

    current: BaseException | None = error
    for _ in range(6):
        if current is None:
            break
        status_code = getattr(current, "status_code", None)
        if status_code in {401, 403}:
            return "VISION_PROVIDER_AUTH"
        if status_code == 402:
            return "VISION_PROVIDER_CREDITS"
        if status_code == 404:
            return "VISION_MODEL_NOT_AVAILABLE"
        if status_code == 429:
            return "VISION_PROVIDER_RATE_LIMIT"
        if status_code in {400, 413, 415, 422}:
            return "VISION_REQUEST_REJECTED"
        if status_code in {408, 504}:
            return "VISION_PROVIDER_TIMEOUT"
        if isinstance(status_code, int) and status_code >= 500:
            return "VISION_PROVIDER_UPSTREAM"
        current = current.__cause__ or current.__context__
    return "VISION_PROVIDER_FAILURE"


def _single_error_code(codes: list[str]) -> str | None:
    """Collapse one document's provider errors without leaking call details.

    Args:
        codes: Stable error codes recorded for failed page calls.

    Returns:
        The sole code, a multiple-errors marker, or None when no provider call failed.

    Raises:
        None.
    """

    unique = set(codes)
    if not unique:
        return None
    if len(unique) == 1:
        return next(iter(unique))
    return "VISION_PROVIDER_MULTIPLE_ERRORS"
