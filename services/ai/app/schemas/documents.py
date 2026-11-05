"""Typed document-processing values shared by parsers and index services."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExtractedPage(BaseModel):
    """Normalized text and content-free extraction metadata for one PDF page."""

    model_config = ConfigDict(frozen=True)

    page_number: int = Field(ge=1)
    text: str = Field(min_length=1)
    layout_block_count: int = Field(default=0, ge=0)
    table_count: int = Field(default=0, ge=0)
    vision_caption_count: int = Field(default=0, ge=0)
    vision_status: Literal["NOT_VISUAL", "DISABLED", "CAPTIONED", "FAILED"] = "NOT_VISUAL"
    contains_latex: bool = False


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
