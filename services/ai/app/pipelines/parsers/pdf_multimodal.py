"""Page-bounded PDF text and visual extraction using PyMuPDF and a Vision provider."""

import asyncio
import math
import re

import pymupdf

from app.clients.protocols import VisionCaptionClient
from app.pipelines.parsers.pdf import PdfProcessingError
from app.pipelines.parsers.pdf_layout import extract_page_layout
from app.schemas.documents import ExtractedPage, ParsedPdf

LATEX_PATTERN = re.compile(r"\$\$[^$]+\$\$|(?<!\$)\$[^$\n]+\$(?!\$)")


async def parse_pdf_multimodal(
    content: bytes,
    *,
    max_bytes: int = 50 * 1024 * 1024,
    max_pages: int = 500,
    max_text_characters: int = 2_000_000,
    vision_client: VisionCaptionClient | None = None,
    min_image_dimension: int = 100,
    max_vision_pages: int = 100,
    vision_timeout_seconds: float = 20.0,
    max_vision_context_characters: int = 400,
    max_vision_caption_characters: int = 4_000,
    render_scale: float = 1.5,
    max_render_pixels: int = 4_000_000,
    max_tables_per_page: int = 20,
    max_table_cells_per_page: int = 2_000,
) -> ParsedPdf:
    """Extract text and visual technical descriptions from PDF pages without OCR.

    Args:
        content: Complete PDF bytes from authorized source.
        max_bytes: Maximum accepted file size in bytes (default 50 MiB).
        max_pages: Maximum allowed total pages in PDF (default 500).
        max_text_characters: Maximum cumulative characters allowed.
        vision_client: Optional Vision LLM client to describe diagrams/schematics.
        min_image_dimension: Minimum pixel width/height to filter out small icons.
        max_vision_pages: Maximum page-level Vision calls for one document.
        vision_timeout_seconds: Maximum provider wait time for one visual page.
        max_vision_context_characters: Maximum text-layer context sent with one image.
        max_vision_caption_characters: Maximum accepted provider caption length.
        render_scale: Preferred raster scale for page-level Vision input.
        max_render_pixels: Maximum rendered pixels per page before scale is reduced.
        max_tables_per_page: Maximum tables extracted from one page.
        max_table_cells_per_page: Maximum cells extracted across tables on one page.

    Returns:
        ParsedPdf containing page count and extracted pages enriched with visual captions.

    Raises:
        PdfProcessingError: If PDF is invalid, encrypted, oversized, or empty.
        ValueError: If resource limit parameters are invalid.
    """
    if (
        min(
            max_bytes,
            max_pages,
            max_text_characters,
            min_image_dimension,
            max_vision_pages,
            max_vision_context_characters,
            max_vision_caption_characters,
            max_render_pixels,
            max_tables_per_page,
            max_table_cells_per_page,
        )
        <= 0
    ):
        raise ValueError("PDF resource limits must be positive")
    if not 0.5 <= render_scale <= 3.0:
        raise ValueError("render_scale must be between 0.5 and 3.0")
    if not 0.1 <= vision_timeout_seconds <= 120:
        raise ValueError("vision_timeout_seconds must be between 0.1 and 120")
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
        doc = pymupdf.open(stream=content, filetype="pdf")
    except Exception as error:
        raise PdfProcessingError(
            code="PDF_INVALID",
            message="Failed to parse PDF document structure",
        ) from error

    try:
        if doc.is_encrypted:
            raise PdfProcessingError(
                code="PDF_ENCRYPTED",
                message="Encrypted PDF files are not supported",
            )

        page_count = len(doc)
        if page_count < 1:
            raise PdfProcessingError(code="PDF_EMPTY", message="PDF contains no pages")
        if page_count > max_pages:
            raise PdfProcessingError(
                code="PDF_TOO_MANY_PAGES",
                message=f"PDF contains {page_count} pages, exceeding the limit of {max_pages}",
            )

        extracted_pages: list[ExtractedPage] = []
        cumulative_characters = 0
        vision_page_count = 0
        text_layer_page_count = 0

        for page_index in range(page_count):
            page = doc[page_index]
            page_number = page_index + 1

            # 1. Extract reading-order blocks and tables without duplicating table cells.
            layout = extract_page_layout(
                page,
                page_number=page_number,
                max_tables=max_tables_per_page,
                max_table_cells=max_table_cells_per_page,
            )
            clean_text = layout.text
            if clean_text or layout.tables:
                text_layer_page_count += 1

            # Render at most once per visual page. This also covers vector diagrams, which
            # are not returned by page.get_images(), and avoids one provider call per tiny
            # image fragment in exported lecture PDFs.
            visual_captions: list[str] = []
            has_visual_content = _has_visual_content(page, min_image_dimension=min_image_dimension)
            vision_status = "NOT_VISUAL"
            if has_visual_content and vision_client is None:
                vision_status = "DISABLED"
            elif has_visual_content and vision_client is not None:
                vision_page_count += 1
                if vision_page_count > max_vision_pages:
                    raise PdfProcessingError(
                        code="PDF_VISION_PAGE_LIMIT",
                        message="PDF exceeds the configured visual page limit",
                    )
                try:
                    image_bytes = _render_page_png(
                        page,
                        render_scale=render_scale,
                        max_render_pixels=max_render_pixels,
                    )
                    caption = await asyncio.wait_for(
                        vision_client.describe_image(
                            image_bytes=image_bytes,
                            mime_type="image/png",
                            context=clean_text[:max_vision_context_characters],
                        ),
                        timeout=vision_timeout_seconds,
                    )
                    normalized_caption = caption.strip()
                    if (
                        not normalized_caption
                        or len(normalized_caption) > max_vision_caption_characters
                    ):
                        vision_status = "FAILED"
                    else:
                        visual_captions.append(
                            f"[Sơ đồ/Hình ảnh trang {page_number}]:\n{normalized_caption}"
                        )
                        vision_status = "CAPTIONED"
                except Exception:
                    # Vision is enrichment only: keep the authorized text layer and continue.
                    vision_status = "FAILED"

            # 3. Combine text layer and visual captions
            page_parts: list[str] = []
            if clean_text:
                page_parts.append(clean_text)
            if layout.tables:
                page_parts.extend(layout.tables)
            if visual_captions:
                page_parts.extend(visual_captions)

            full_page_text = "\n\n".join(page_parts).strip()
            if full_page_text:
                cumulative_characters += len(full_page_text)
                if cumulative_characters > max_text_characters:
                    raise PdfProcessingError(
                        code="PDF_TEXT_TOO_LARGE",
                        message="PDF exceeds maximum allowed extracted text length",
                    )
                extracted_pages.append(
                    ExtractedPage(
                        page_number=page_number,
                        text=full_page_text,
                        layout_block_count=layout.block_count,
                        table_count=layout.table_count,
                        vision_caption_count=len(visual_captions),
                        vision_status=vision_status,
                        contains_latex=bool(LATEX_PATTERN.search(full_page_text)),
                    )
                )

        # Vision is enrichment, never a replacement for the required PDF text layer.
        # Deliberately ignore provider captions when enforcing this gate.
        if text_layer_page_count == 0:
            raise PdfProcessingError(
                code="PDF_TEXT_REQUIRED",
                message="PDF must contain an extractable text layer",
            )

        if not extracted_pages:
            raise PdfProcessingError(
                code="PDF_TEXT_REQUIRED",
                message="PDF must contain extractable text content",
            )

        return ParsedPdf(page_count=page_count, pages=tuple(extracted_pages))

    finally:
        doc.close()


def _has_visual_content(page: pymupdf.Page, *, min_image_dimension: int) -> bool:
    """Detect a page that needs one page-level Vision description.

    Args:
        page: Open PyMuPDF page owned by the current parser call.
        min_image_dimension: Minimum embedded-image width and height.

    Returns:
        True when the page contains vector drawings or a non-trivial embedded image.

    Raises:
        None. PyMuPDF inspection failures are treated as no visual enrichment.
    """

    try:
        if page.get_drawings():
            return True
        return any(
            image[2] >= min_image_dimension and image[3] >= min_image_dimension
            for image in page.get_images(full=True)
        )
    except Exception:
        return False


def _render_page_png(
    page: pymupdf.Page,
    *,
    render_scale: float,
    max_render_pixels: int,
) -> bytes:
    """Render one complete page to bounded RGB PNG bytes for Vision.

    Args:
        page: Open PyMuPDF page owned by the current parser call.
        render_scale: Preferred raster scale from 0.5 to 3.0.
        max_render_pixels: Hard upper bound for width multiplied by height.

    Returns:
        Non-empty PNG bytes containing the complete page.

    Raises:
        ValueError: If render settings are invalid.
        RuntimeError: If PyMuPDF returns an empty image.
    """

    if not 0.5 <= render_scale <= 3.0 or max_render_pixels <= 0:
        raise ValueError("invalid page render limits")
    page_pixels = max(1.0, page.rect.width * page.rect.height)
    bounded_scale = min(render_scale, math.sqrt(max_render_pixels / page_pixels))
    if bounded_scale <= 0:
        raise RuntimeError("page render scale is invalid")
    pixmap = page.get_pixmap(
        matrix=pymupdf.Matrix(bounded_scale, bounded_scale),
        colorspace=pymupdf.csRGB,
        alpha=False,
    )
    content = pixmap.tobytes("png")
    if not content:
        raise RuntimeError("page renderer returned no image")
    return content
