"""Typed document-processing values shared by parsers and index services."""

from pydantic import BaseModel, ConfigDict, Field


class ExtractedPage(BaseModel):
    """Normalized text extracted from one 1-based PDF page."""

    model_config = ConfigDict(frozen=True)

    page_number: int = Field(ge=1)
    text: str = Field(min_length=1)


class TextChunk(BaseModel):
    """One grounded text chunk that never crosses a page boundary."""

    model_config = ConfigDict(frozen=True)

    page_number: int = Field(ge=1)
    chunk_index: int = Field(ge=0)
    text: str = Field(min_length=1)


class ParsedPdf(BaseModel):
    """Total PDF page count plus non-empty text pages in original order."""

    model_config = ConfigDict(frozen=True)
    page_count: int = Field(ge=1)
    pages: tuple[ExtractedPage, ...] = Field(min_length=1)
