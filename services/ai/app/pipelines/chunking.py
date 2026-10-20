"""Deterministic page-bounded text chunking."""

from app.schemas.documents import ExtractedPage, TextChunk


def chunk_pages(
    pages: tuple[ExtractedPage, ...],
    *,
    max_characters: int = 1_800,
    overlap_characters: int = 200,
) -> tuple[TextChunk, ...]:
    """Split extracted pages into overlapping chunks without crossing pages.

    Args:
        pages: Extracted non-empty pages in source order.
        max_characters: Maximum characters in one chunk.
        overlap_characters: Characters carried from the previous chunk.

    Returns:
        Ordered chunks with one global zero-based chunk index.

    Raises:
        ValueError: If limits are invalid, pages are empty, page numbers repeat,
            or pages are not strictly ordered.
    """

    if not pages:
        raise ValueError("pages must not be empty")
    if max_characters < 100:
        raise ValueError("max_characters must be at least 100")
    if overlap_characters < 0 or overlap_characters >= max_characters:
        raise ValueError("overlap_characters must be between 0 and max_characters")
    page_numbers = [page.page_number for page in pages]
    if page_numbers != sorted(set(page_numbers)):
        raise ValueError("page numbers must be unique and strictly increasing")

    chunks: list[TextChunk] = []
    for page in pages:
        start = 0
        while start < len(page.text):
            hard_end = min(start + max_characters, len(page.text))
            end = hard_end
            if hard_end < len(page.text):
                preferred_break = page.text.rfind(" ", start, hard_end)
                if preferred_break > start + max_characters // 2:
                    end = preferred_break
            chunk_text = page.text[start:end].strip()
            if chunk_text:
                chunks.append(
                    TextChunk(
                        page_number=page.page_number,
                        chunk_index=len(chunks),
                        text=chunk_text,
                    )
                )
            if end >= len(page.text):
                break
            # Continue from the actual word boundary, not the original hard limit.
            start = max(end - overlap_characters, start + 1)
    return tuple(chunks)
