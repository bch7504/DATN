"""Synthetic tests for PDF extraction and page-bounded chunking."""

from io import BytesIO

import pytest
from pypdf import PdfWriter
from reportlab.pdfgen import canvas

from app.pipelines.chunking import chunk_pages
from app.pipelines.parsers.pdf import PdfProcessingError, extract_pdf_pages
from app.schemas.documents import ExtractedPage


def test_word_boundary_chunking_never_skips_characters() -> None:
    """A soft split before the hard limit must not lose text between successive chunks."""
    text = "a" * 60 + " " + "b" * 80 + " " + "c" * 80
    chunks = chunk_pages(
        (ExtractedPage(page_number=1, text=text),), max_characters=100, overlap_characters=0
    )
    assert "".join(chunk.text for chunk in chunks).replace(" ", "") == text.replace(" ", "")


def _text_pdf(*page_texts: str) -> bytes:
    """Build an in-memory PDF containing synthetic text.

    Args:
        page_texts: Text written to consecutive PDF pages.

    Returns:
        Valid PDF bytes with an extractable text layer.

    Raises:
        None.
    """

    output = BytesIO()
    document = canvas.Canvas(output)
    for page_text in page_texts:
        document.drawString(72, 760, page_text)
        document.showPage()
    document.save()
    return output.getvalue()


def _encrypted_pdf() -> bytes:
    """Build an encrypted synthetic PDF without external files.

    Args:
        None.

    Returns:
        Encrypted PDF bytes.

    Raises:
        None.
    """

    output = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.encrypt("synthetic-password")
    writer.write(output)
    return output.getvalue()


def test_extract_pdf_pages_preserves_page_numbers() -> None:
    """Verify extraction preserves source page numbers and normalized text."""

    pages = extract_pdf_pages(
        _text_pdf("ACID guarantees transactions.", "Isolation prevents conflicts.")
    )

    assert [(page.page_number, page.text) for page in pages] == [
        (1, "ACID guarantees transactions."),
        (2, "Isolation prevents conflicts."),
    ]


def test_extract_pdf_pages_rejects_encrypted_pdf() -> None:
    """Verify encrypted PDFs return the stable PDF_ENCRYPTED code."""

    with pytest.raises(PdfProcessingError) as captured:
        extract_pdf_pages(_encrypted_pdf())

    assert captured.value.code == "PDF_ENCRYPTED"


def test_extract_pdf_pages_requires_text_layer() -> None:
    """Verify image-only or blank PDFs are rejected without OCR fallback."""

    output = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.write(output)

    with pytest.raises(PdfProcessingError) as captured:
        extract_pdf_pages(output.getvalue())

    assert captured.value.code == "PDF_TEXT_REQUIRED"


def test_chunk_pages_keeps_chunks_inside_source_page() -> None:
    """Verify chunks are ordered and never combine two page locations."""

    pages = (
        ExtractedPage(page_number=1, text="alpha " * 80),
        ExtractedPage(page_number=2, text="beta " * 80),
    )

    chunks = chunk_pages(pages, max_characters=120, overlap_characters=20)

    assert len(chunks) > 2
    assert [chunk.chunk_index for chunk in chunks] == list(range(len(chunks)))
    assert {chunk.page_number for chunk in chunks} == {1, 2}
    assert all(("alpha" in chunk.text) ^ ("beta" in chunk.text) for chunk in chunks)
