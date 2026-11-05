"""Deterministic page layout and Markdown table extraction with PyMuPDF."""

from dataclasses import dataclass

import pymupdf

from app.pipelines.parsers.pdf import PdfProcessingError, _normalize_text


@dataclass(frozen=True)
class PageLayout:
    """Page text in reading order plus content-free table metadata."""

    text: str
    block_count: int
    tables: tuple[str, ...]
    table_count: int
    table_cell_count: int


def extract_page_layout(
    page: pymupdf.Page,
    *,
    page_number: int,
    max_tables: int = 20,
    max_table_cells: int = 2_000,
) -> PageLayout:
    """Extract ordered text blocks and bounded tables from one PDF page.

    Args:
        page: Open PyMuPDF page owned by the caller.
        page_number: Trusted one-based source page number.
        max_tables: Maximum tables accepted on this page.
        max_table_cells: Maximum extracted cells across all tables on this page.

    Returns:
        Ordered non-table text and Markdown tables with content-free counts.

    Raises:
        ValueError: If limits or page number are invalid.
        PdfProcessingError: If table counts exceed configured resource limits.
    """

    if page_number < 1 or min(max_tables, max_table_cells) <= 0:
        raise ValueError("layout extraction limits and page number must be positive")

    table_objects = tuple(page.find_tables().tables)
    if len(table_objects) > max_tables:
        raise PdfProcessingError(
            code="PDF_TABLE_LIMIT",
            message="PDF page exceeds the configured table limit",
        )

    table_rectangles = tuple(pymupdf.Rect(table.bbox) for table in table_objects)
    blocks = tuple(
        block
        for block in page.get_text("blocks", sort=True)
        if len(block) > 6 and block[6] == 0 and _normalize_text(str(block[4]))
    )
    text_parts = tuple(
        _normalize_text(str(block[4]))
        for block in blocks
        if not _mostly_inside_any_table(pymupdf.Rect(block[:4]), table_rectangles)
    )

    table_markdown: list[str] = []
    table_cell_count = 0
    for table_index, table in enumerate(table_objects, start=1):
        rows = tuple(tuple(_normalize_cell(cell) for cell in row) for row in table.extract())
        width = max((len(row) for row in rows), default=0)
        table_cell_count += sum(len(row) for row in rows)
        if table_cell_count > max_table_cells:
            raise PdfProcessingError(
                code="PDF_TABLE_CELL_LIMIT",
                message="PDF page exceeds the configured table cell limit",
            )
        if width:
            table_markdown.append(
                _to_markdown_table(
                    rows=rows,
                    width=width,
                    label=f"Bảng trang {page_number}.{table_index}",
                )
            )

    return PageLayout(
        text="\n\n".join(part for part in text_parts if part).strip(),
        block_count=len(blocks),
        tables=tuple(table_markdown),
        table_count=len(table_markdown),
        table_cell_count=table_cell_count,
    )


def _mostly_inside_any_table(block: pymupdf.Rect, tables: tuple[pymupdf.Rect, ...]) -> bool:
    """Check whether most of one text block is already represented by a table.

    Args:
        block: Bounding rectangle of a text block.
        tables: Bounding rectangles of tables detected on the page.

    Returns:
        True when at least half of the block area overlaps a table.

    Raises:
        None.
    """

    area = block.get_area()
    if area <= 0:
        return False
    return any(((block & table).get_area() / area) >= 0.5 for table in tables)


def _normalize_cell(value: object) -> str:
    """Normalize one table cell without allowing it to break Markdown columns.

    Args:
        value: Cell value returned by PyMuPDF, including possible None.

    Returns:
        Single-line escaped cell text.

    Raises:
        None.
    """

    if value is None:
        return ""
    return _normalize_text(str(value)).replace("\n", "<br>").replace("|", "\\|")


def _to_markdown_table(
    *,
    rows: tuple[tuple[str, ...], ...],
    width: int,
    label: str,
) -> str:
    """Serialize every detected row under deterministic generic column names.

    Args:
        rows: Normalized rows preserving the PDF table order.
        width: Maximum number of cells in any row.
        label: Page-scoped table label.

    Returns:
        Markdown table that keeps all source rows as data.

    Raises:
        ValueError: If width or label are invalid.
    """

    if width < 1 or not label.strip():
        raise ValueError("table width and label must be valid")
    header = tuple(f"Cột {index}" for index in range(1, width + 1))
    padded_rows = tuple(row + ("",) * (width - len(row)) for row in rows)
    lines = [
        f"[{label}]",
        "| " + " | ".join(header) + " |",
        "| " + " | ".join("---" for _ in header) + " |",
    ]
    lines.extend("| " + " | ".join(row) + " |" for row in padded_rows)
    return "\n".join(lines)
