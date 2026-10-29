"""Generate concise text-layer Slide PDFs from reference PDFs for local StudyFlow testing.

This utility never calls the model provider. It extracts text from the authorized local source,
groups source pages, and lays out a compact teaching deck whose citations remain traceable to the
source page ranges. The generated file is suitable for upload as ``SLIDE_PDF``.
"""

from __future__ import annotations

import argparse
import math
import re
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph

PAGE_SIZE = landscape((210 * mm, 148 * mm))
PTIT_RED = colors.HexColor("#D71920")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#64748B")
SOFT = colors.HexColor("#FFF1F2")


@dataclass(frozen=True)
class SlideSection:
    """One generated content slide.

    Args:
        title: Visible slide heading.
        bullets: Extracted and shortened source statements.
        page_from: First 1-based source page represented by the slide.
        page_to: Last 1-based source page represented by the slide.

    Returns:
        Immutable slide layout data with an explicit source page range.

    Raises:
        No exception after construction; callers validate non-empty bullets.
    """

    title: str
    bullets: tuple[str, ...]
    page_from: int
    page_to: int


def _normalize_text(value: str) -> str:
    """Normalize extracted PDF text without changing its meaning.

    Args:
        value: Raw extracted line or paragraph.

    Returns:
        A single-space text string with common bullet prefixes removed.

    Raises:
        No exception; an empty input returns an empty string.
    """

    compact = re.sub(r"\s+", " ", value).strip()
    return re.sub(r"^[\u2022\-–—▪◦]+\s*", "", compact).strip()


def _shorten(value: str, limit: int = 145) -> str:
    """Shorten one source statement at a word boundary.

    Args:
        value: Normalized source statement.
        limit: Maximum visible character count, default 145 and minimum 24.

    Returns:
        Original text when short enough, otherwise a word-boundary excerpt ending in an ellipsis.

    Raises:
        ValueError: If ``limit`` is below 24 characters.
    """

    if limit < 24:
        raise ValueError("limit must be at least 24")
    if len(value) <= limit:
        return value
    prefix = value[: limit - 1].rsplit(" ", 1)[0].rstrip(" ,;:")
    return f"{prefix}…"


def _page_candidates(text: str) -> list[str]:
    """Select readable statements from one extracted PDF page.

    Args:
        text: Extracted page text from pypdf.

    Returns:
        Ordered, de-duplicated statements suitable for slide bullets.

    Raises:
        No exception; pages without usable text return an empty list.
    """

    raw_parts = re.split(r"[\r\n]+|(?<=[.!?])\s+(?=[A-ZÀ-Ỹ0-9])", text)
    selected: list[str] = []
    seen: set[str] = set()
    for raw in raw_parts:
        item = _normalize_text(raw)
        key = item.casefold()
        if len(item) < 18 or key in seen or re.fullmatch(r"\d+", item):
            continue
        if len(item.split()) < 4:
            continue
        seen.add(key)
        selected.append(_shorten(item))
    return selected


def extract_sections(source: Path, max_content_slides: int = 10) -> tuple[int, list[SlideSection]]:
    """Extract source pages and group them into concise slide sections.

    Args:
        source: Existing text-layer PDF path.
        max_content_slides: Maximum generated content slides, from 4 to 16.

    Returns:
        Tuple of total source pages and ordered slide sections with page ranges.

    Raises:
        FileNotFoundError: If ``source`` does not exist.
        ValueError: If the source is not PDF, has no pages/text, or slide limit is invalid.
    """

    if not source.is_file():
        raise FileNotFoundError(source)
    if source.suffix.casefold() != ".pdf":
        raise ValueError("source must be a PDF")
    if not 4 <= max_content_slides <= 16:
        raise ValueError("max_content_slides must be between 4 and 16")

    reader = PdfReader(str(source))
    page_texts = [(page.extract_text() or "").strip() for page in reader.pages]
    if not page_texts or not any(page_texts):
        raise ValueError("source PDF must contain an extractable text layer")

    group_count = min(max_content_slides, max(4, math.ceil(len(page_texts) / 4)))
    group_size = math.ceil(len(page_texts) / group_count)
    sections: list[SlideSection] = []
    for start in range(0, len(page_texts), group_size):
        end = min(len(page_texts), start + group_size)
        candidates: list[str] = []
        for page_text in page_texts[start:end]:
            candidates.extend(_page_candidates(page_text))
        bullets: list[str] = []
        seen: set[str] = set()
        for item in candidates:
            key = item.casefold()
            if key not in seen:
                seen.add(key)
                bullets.append(item)
            if len(bullets) == 5:
                break
        if not bullets:
            bullets = [
                "Phần này cần được đọc trực tiếp trong tài liệu nguồn để xem đầy đủ nội dung."
            ]
        sections.append(
            SlideSection(
                title=f"Nội dung trọng tâm · Trang {start + 1}–{end}",
                bullets=tuple(bullets),
                page_from=start + 1,
                page_to=end,
            )
        )
    return len(page_texts), sections


def _register_fonts() -> tuple[str, str]:
    """Register Unicode fonts available on the local Windows development machine.

    Args:
        None.

    Returns:
        Tuple of regular and bold ReportLab font names.

    Raises:
        FileNotFoundError: If the required Arial font files are unavailable.
    """

    regular_path = Path("C:/Windows/Fonts/arial.ttf")
    bold_path = Path("C:/Windows/Fonts/arialbd.ttf")
    if not regular_path.is_file() or not bold_path.is_file():
        raise FileNotFoundError("Arial Unicode-capable fonts were not found in C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("StudyFlowArial", str(regular_path)))
    pdfmetrics.registerFont(TTFont("StudyFlowArialBold", str(bold_path)))
    return "StudyFlowArial", "StudyFlowArialBold"


def _draw_chrome(canvas: Canvas, slide_no: int, total_slides: int, regular_font: str) -> None:
    """Draw the common PTIT-style frame and slide counter.

    Args:
        canvas: Active ReportLab canvas.
        slide_no: Current 1-based slide number.
        total_slides: Total number of slides in the output deck.
        regular_font: Registered Unicode regular font name.

    Returns:
        None; draws directly onto the current page.

    Raises:
        ReportLab drawing exceptions are propagated to the caller.
    """

    width, height = PAGE_SIZE
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(PTIT_RED)
    canvas.rect(0, height - 8 * mm, width, 8 * mm, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
    canvas.line(14 * mm, 12 * mm, width - 14 * mm, 12 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont(regular_font, 8)
    canvas.drawRightString(width - 14 * mm, 6.8 * mm, f"StudyFlow · {slide_no}/{total_slides}")


def _draw_paragraph(
    canvas: Canvas,
    text: str,
    x: float,
    y_top: float,
    width: float,
    height: float,
    style: ParagraphStyle,
) -> None:
    """Draw one wrapped paragraph in a top-anchored rectangle.

    Args:
        canvas: Active PDF canvas.
        text: Trusted extracted/escaped plain text to draw.
        x: Left coordinate in points.
        y_top: Top coordinate in points.
        width: Available width in points.
        height: Available height in points.
        style: ReportLab paragraph style.

    Returns:
        None; draws the paragraph on the current page.

    Raises:
        ReportLab layout exceptions are propagated.
    """

    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    paragraph = Paragraph(safe, style)
    _, used_height = paragraph.wrap(width, height)
    paragraph.drawOn(canvas, x, y_top - used_height)


def render_deck(source: Path, output: Path, title: str, max_content_slides: int = 10) -> Path:
    """Render one source PDF into a concise, text-layer Slide PDF deck.

    Args:
        source: Existing source/reference PDF.
        output: Destination PDF path; parent directory is created if needed.
        title: Visible lesson title.
        max_content_slides: Maximum number of content slides, default 10.

    Returns:
        Resolved output path after a successful render.

    Raises:
        FileNotFoundError: If source/font files are missing.
        ValueError: If input constraints or PDF text layer are invalid.
        OSError: If the output cannot be written.
    """

    total_source_pages, sections = extract_sections(source, max_content_slides)
    regular_font, bold_font = _register_fonts()
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas = Canvas(str(output), pagesize=PAGE_SIZE, pageCompression=1)
    width, height = PAGE_SIZE
    total_slides = len(sections) + 2

    title_style = ParagraphStyle(
        "title", fontName=bold_font, fontSize=27, leading=33, textColor=INK, alignment=TA_LEFT
    )
    subtitle_style = ParagraphStyle(
        "subtitle", fontName=regular_font, fontSize=13, leading=19, textColor=MUTED
    )
    heading_style = ParagraphStyle(
        "heading", fontName=bold_font, fontSize=21, leading=26, textColor=INK
    )
    bullet_style = ParagraphStyle(
        "bullet", fontName=regular_font, fontSize=12, leading=18, textColor=INK
    )

    _draw_chrome(canvas, 1, total_slides, regular_font)
    canvas.setFillColor(SOFT)
    canvas.roundRect(18 * mm, 27 * mm, width - 36 * mm, height - 52 * mm, 7 * mm, fill=1, stroke=0)
    canvas.setFillColor(PTIT_RED)
    canvas.circle(33 * mm, height - 32 * mm, 7 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont(bold_font, 13)
    canvas.drawCentredString(33 * mm, height - 35.5 * mm, "PTIT")
    _draw_paragraph(canvas, title, 48 * mm, height - 30 * mm, width - 75 * mm, 45 * mm, title_style)
    _draw_paragraph(
        canvas,
        (
            "Slide học tập được tạo từ tài liệu tham khảo "
            f"“{source.name}” ({total_source_pages} trang)."
        ),
        48 * mm,
        height - 72 * mm,
        width - 75 * mm,
        30 * mm,
        subtitle_style,
    )
    canvas.showPage()

    _draw_chrome(canvas, 2, total_slides, regular_font)
    _draw_paragraph(
        canvas,
        "Mục tiêu học tập",
        18 * mm,
        height - 20 * mm,
        width - 36 * mm,
        20 * mm,
        heading_style,
    )
    goals = (
        "Nắm được các khái niệm và thuật ngữ chính của chương.",
        "Theo dõi nội dung theo từng slide và đối chiếu lại đúng trang tài liệu nguồn.",
        "Đặt câu hỏi cho AI Tutor trong phạm vi slide đang xem.",
        "Dùng kiến thức có nguồn để ôn tập và tạo bộ câu hỏi trắc nghiệm.",
    )
    for index, goal in enumerate(goals):
        y = height - (49 + index * 20) * mm
        canvas.setFillColor(PTIT_RED)
        canvas.circle(23 * mm, y + 2 * mm, 2.4 * mm, fill=1, stroke=0)
        _draw_paragraph(canvas, goal, 30 * mm, y + 6 * mm, width - 52 * mm, 16 * mm, bullet_style)
    canvas.showPage()

    for offset, section in enumerate(sections, start=3):
        _draw_chrome(canvas, offset, total_slides, regular_font)
        _draw_paragraph(
            canvas,
            section.title,
            18 * mm,
            height - 20 * mm,
            width - 36 * mm,
            22 * mm,
            heading_style,
        )
        for bullet_index, bullet in enumerate(section.bullets):
            y = height - (48 + bullet_index * 17) * mm
            canvas.setFillColor(PTIT_RED)
            canvas.circle(23 * mm, y + 1.8 * mm, 2.1 * mm, fill=1, stroke=0)
            _draw_paragraph(
                canvas, bullet, 30 * mm, y + 6 * mm, width - 50 * mm, 15 * mm, bullet_style
            )
        canvas.setFillColor(MUTED)
        canvas.setFont(regular_font, 8)
        canvas.drawString(
            18 * mm, 17 * mm, f"Nguồn: {source.name} · Trang {section.page_from}–{section.page_to}"
        )
        canvas.showPage()

    canvas.save()
    return output.resolve()


def build_parser() -> argparse.ArgumentParser:
    """Build the command-line contract for slide generation.

    Args:
        None.

    Returns:
        Argument parser requiring source, output and title; optional content slide limit.

    Raises:
        No exception during normal parser construction.
    """

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="Text-layer source PDF")
    parser.add_argument("--output", required=True, type=Path, help="Generated Slide PDF")
    parser.add_argument("--title", required=True, help="Visible lesson title")
    parser.add_argument("--max-content-slides", type=int, default=10)
    return parser


def main() -> int:
    """Run slide generation from CLI arguments.

    Args:
        None; reads validated command-line arguments.

    Returns:
        Exit status 0 after writing the complete PDF.

    Raises:
        Input, extraction, font and filesystem exceptions propagate with a non-zero process exit.
    """

    args = build_parser().parse_args()
    render_deck(args.source, args.output, args.title, args.max_content_slides)
    print("Generated slide PDF successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
