"""Safe text extraction from PDF files with an existing text layer."""

import re
from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.schemas.documents import ExtractedPage, ParsedPdf

WHITESPACE_PATTERN = re.compile(r"[ \t\f\v]+")
MULTIPLE_NEWLINES_PATTERN = re.compile(r"\n{3,}")


class PdfProcessingError(Exception):
    """Expected PDF validation or extraction failure with a safe code."""

    def __init__(self, *, code: str, message: str) -> None:
        """Create a safe PDF processing error.

        Args:
            code: Stable machine-readable error code.
            message: Safe message that never includes document content.

        Returns:
            None.

        Raises:
            ValueError: If code or message is blank.
        """

        if not code.strip() or not message.strip():
            raise ValueError("PDF error code and message must not be blank")
        super().__init__(message)
        self.code = code
        self.message = message


def _normalize_text(text: str) -> str:
    """Normalize whitespace while preserving meaningful line boundaries.

    Args:
        text: Raw text returned by pypdf for one page.

    Returns:
        Clean text suitable for deterministic page-level chunking.

    Raises:
        None.
    """

    normalized_lines = [
        WHITESPACE_PATTERN.sub(" ", line).strip()
        for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    ]
    joined = "\n".join(normalized_lines)
    return MULTIPLE_NEWLINES_PATTERN.sub("\n\n", joined).strip()


def parse_pdf(
    content: bytes,
    *,
    max_bytes: int = 50 * 1024 * 1024,
    max_pages: int = 500,
    max_text_characters: int = 2_000_000,
) -> ParsedPdf:
    """Extract non-empty text from each PDF page without OCR.

    Args:
        content: Complete PDF bytes obtained from an authorized signed URL.
        max_bytes: Maximum accepted file size. Defaults to 50 MiB and must be
            positive.
        max_pages: Maximum total PDF pages, default 500.
        max_text_characters: Maximum extracted text characters, default two million.

    Returns:
        Non-empty text pages and total PDF page count, including blank pages.

    Raises:
        ValueError: If max_bytes is not positive.
        PdfProcessingError: If the file is empty, too large, not a readable
            PDF, encrypted, or has no extractable text layer.
    """

    if min(max_bytes, max_pages, max_text_characters) <= 0:
        raise ValueError("PDF resource limits must be positive")
    if not content:
        raise PdfProcessingError(code="PDF_EMPTY", message="PDF file is empty")
    if len(content) > max_bytes:
        raise PdfProcessingError(
            code="PDF_TOO_LARGE",
            message="PDF exceeds the configured size limit",
        )
    if not content.startswith(b"%PDF-"):
        raise PdfProcessingError(
            code="PDF_INVALID",
            message="File is not a valid PDF",
        )
    try:
        reader = PdfReader(BytesIO(content), strict=True)
        if reader.is_encrypted:
            raise PdfProcessingError(
                code="PDF_ENCRYPTED",
                message="Encrypted PDF is not supported",
            )
        page_count = len(reader.pages)
        if page_count > max_pages:
            raise PdfProcessingError(code="PDF_TOO_MANY_PAGES", message="PDF page limit exceeded")
        character_count = 0
        pages: list[ExtractedPage] = []
        for page_number, page in enumerate(reader.pages, start=1):
            text = _normalize_text(page.extract_text() or "")
            character_count += len(text)
            if character_count > max_text_characters:
                raise PdfProcessingError(
                    code="PDF_TEXT_TOO_LARGE", message="PDF text limit exceeded"
                )
            if text:
                pages.append(ExtractedPage(page_number=page_number, text=text))
    except PdfProcessingError:
        raise
    except (PdfReadError, OSError, ValueError) as error:
        raise PdfProcessingError(
            code="PDF_INVALID",
            message="PDF cannot be read",
        ) from error
    if not pages:
        raise PdfProcessingError(
            code="PDF_TEXT_REQUIRED",
            message="PDF must contain an extractable text layer",
        )
    return ParsedPdf(page_count=page_count, pages=tuple(pages))


def extract_pdf_pages(
    content: bytes, *, max_bytes: int = 50 * 1024 * 1024
) -> tuple[ExtractedPage, ...]:
    """Extract text pages with safe resource limits.

    Args: content: authorized PDF bytes; max_bytes: positive file size cap.
    Returns: Non-empty pages with original one-based page numbers.
    Raises: PdfProcessingError for unsupported/oversized PDF; ValueError for invalid cap.
    """
    return parse_pdf(content, max_bytes=max_bytes).pages
