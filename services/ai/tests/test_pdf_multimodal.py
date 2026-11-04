"""Synthetic contracts for page-level multimodal PDF parsing."""

import asyncio
from io import BytesIO

import pytest
from reportlab.pdfgen import canvas

from app.pipelines.parsers.pdf import PdfProcessingError
from app.pipelines.parsers.pdf_multimodal import parse_pdf_multimodal


class RecordingVisionClient:
    """Record page-level Vision calls without sending document content externally."""

    def __init__(
        self,
        *,
        fail: bool = False,
        caption: str = "Sơ đồ tổng hợp gồm hai cổng logic.",
        delay_seconds: float = 0.0,
    ) -> None:
        self.fail = fail
        self.caption = caption
        self.delay_seconds = delay_seconds
        self.calls: list[tuple[bytes, str, str]] = []

    async def describe_image(
        self,
        *,
        image_bytes: bytes,
        mime_type: str = "image/png",
        context: str = "",
    ) -> str:
        """Record one bounded page render and return a synthetic description.

        Args:
            image_bytes: Complete rendered page image.
            mime_type: Expected PNG media type.
            context: Bounded extracted page text.

        Returns:
            A deterministic synthetic caption.

        Raises:
            RuntimeError: When this fake is configured to simulate provider failure.
        """

        self.calls.append((image_bytes, mime_type, context))
        if self.delay_seconds:
            await asyncio.sleep(self.delay_seconds)
        if self.fail:
            raise RuntimeError("synthetic provider failure")
        return self.caption


def _vector_pdf(*, pages: int = 1) -> bytes:
    """Build a text-layer PDF whose diagrams are vectors, not embedded images."""

    output = BytesIO()
    document = canvas.Canvas(output)
    for page_number in range(1, pages + 1):
        document.drawString(72, 760, f"Trang vector {page_number}")
        document.rect(72, 620, 180, 80)
        document.line(252, 660, 340, 660)
        document.showPage()
    document.save()
    return output.getvalue()


def _table_pdf() -> bytes:
    """Build a synthetic two-column table with lines and a text layer."""

    output = BytesIO()
    document = canvas.Canvas(output)
    document.drawString(72, 760, "Bảng chân lý")
    left, bottom, width, height = 72, 620, 240, 90
    document.rect(left, bottom, width, height)
    document.line(left + width / 2, bottom, left + width / 2, bottom + height)
    document.line(left, bottom + height / 2, left + width, bottom + height / 2)
    document.drawString(left + 12, bottom + 62, "A")
    document.drawString(left + 132, bottom + 62, "Y")
    document.drawString(left + 12, bottom + 17, "0")
    document.drawString(left + 132, bottom + 17, "1")
    document.showPage()
    document.save()
    return output.getvalue()


def _image_only_pdf() -> bytes:
    """Build a vector-only PDF without any extractable text layer."""

    output = BytesIO()
    document = canvas.Canvas(output)
    document.rect(72, 620, 180, 80)
    document.line(252, 660, 340, 660)
    document.showPage()
    document.save()
    return output.getvalue()


@pytest.mark.anyio
async def test_vector_page_is_rendered_once_for_vision() -> None:
    """A vector slide must trigger one whole-page Vision call, not zero calls."""

    client = RecordingVisionClient()
    parsed = await parse_pdf_multimodal(_vector_pdf(), vision_client=client)

    assert len(client.calls) == 1
    image_bytes, mime_type, context = client.calls[0]
    assert image_bytes.startswith(b"\x89PNG")
    assert mime_type == "image/png"
    assert context == "Trang vector 1"
    assert "Sơ đồ tổng hợp" in parsed.pages[0].text
    assert parsed.pages[0].vision_status == "CAPTIONED"


@pytest.mark.anyio
async def test_provider_failure_keeps_text_layer_without_error_content() -> None:
    """Vision failure must not index provider errors or discard valid page text."""

    client = RecordingVisionClient(fail=True)
    parsed = await parse_pdf_multimodal(_vector_pdf(), vision_client=client)

    assert len(client.calls) == 1
    assert parsed.pages[0].text == "Trang vector 1"
    assert parsed.pages[0].vision_status == "FAILED"
    assert "failure" not in parsed.pages[0].text


@pytest.mark.anyio
async def test_vision_timeout_keeps_text_layer_and_records_failed_status() -> None:
    """A slow provider must fall back without blocking or replacing authorized text."""

    client = RecordingVisionClient(delay_seconds=0.2)
    parsed = await parse_pdf_multimodal(
        _vector_pdf(),
        vision_client=client,
        vision_timeout_seconds=0.1,
    )

    assert len(client.calls) == 1
    assert parsed.pages[0].text == "Trang vector 1"
    assert parsed.pages[0].vision_caption_count == 0
    assert parsed.pages[0].vision_status == "FAILED"


@pytest.mark.anyio
async def test_oversized_vision_caption_is_not_indexed() -> None:
    """Provider output beyond the configured budget must not enter the vector index."""

    client = RecordingVisionClient(caption="x" * 101)
    parsed = await parse_pdf_multimodal(
        _vector_pdf(),
        vision_client=client,
        max_vision_caption_characters=100,
    )

    assert parsed.pages[0].text == "Trang vector 1"
    assert parsed.pages[0].vision_status == "FAILED"


@pytest.mark.anyio
async def test_vision_caption_cannot_replace_required_pdf_text_layer() -> None:
    """Image-only PDFs remain rejected even when Vision can describe the page."""

    client = RecordingVisionClient()
    with pytest.raises(PdfProcessingError) as captured:
        await parse_pdf_multimodal(_image_only_pdf(), vision_client=client)

    assert captured.value.code == "PDF_TEXT_REQUIRED"
    assert len(client.calls) == 1


@pytest.mark.anyio
async def test_visual_page_records_disabled_status_without_provider() -> None:
    """Metadata distinguishes a disabled provider from a page with no visual content."""

    parsed = await parse_pdf_multimodal(_vector_pdf())

    assert parsed.pages[0].vision_status == "DISABLED"
    assert parsed.pages[0].vision_caption_count == 0


@pytest.mark.anyio
async def test_visual_page_limit_fails_before_unbounded_provider_calls() -> None:
    """Documents above the configured Vision budget fail with a stable safe code."""

    client = RecordingVisionClient()
    with pytest.raises(PdfProcessingError) as captured:
        await parse_pdf_multimodal(
            _vector_pdf(pages=2),
            vision_client=client,
            max_vision_pages=1,
        )

    assert captured.value.code == "PDF_VISION_PAGE_LIMIT"
    assert len(client.calls) == 1


@pytest.mark.anyio
async def test_layout_table_is_markdown_and_not_duplicated_as_plain_blocks() -> None:
    """Detected table cells are represented once in bounded Markdown structure."""

    parsed = await parse_pdf_multimodal(_table_pdf())
    page = parsed.pages[0]

    assert page.layout_block_count >= 1
    assert page.table_count == 1
    assert "[Bảng trang 1.1]" in page.text
    assert "| Cột 1 | Cột 2 |" in page.text
    assert "| A | Y |" in page.text


@pytest.mark.anyio
async def test_vision_latex_is_preserved_and_reported_in_metadata() -> None:
    """Vision formulas retain dollar delimiters for safe KaTeX rendering downstream."""

    client = RecordingVisionClient(caption=r"Hàm logic là $Y=A \cdot B$.")
    parsed = await parse_pdf_multimodal(_vector_pdf(), vision_client=client)

    assert parsed.pages[0].contains_latex is True
    assert parsed.pages[0].vision_caption_count == 1
    assert r"$Y=A \cdot B$" in parsed.pages[0].text
