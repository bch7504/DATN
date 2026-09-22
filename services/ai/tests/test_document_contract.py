"""Synthetic schema-v2 fixtures; no uploaded documents or network calls."""

import pytest
from pydantic import ValidationError

from app.schemas.contracts import DocumentIndexRequest, SourceLocation, SlideTutorAskRequest

PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@pytest.mark.parametrize("pipeline,mime", [("PERSONAL_RAG", "application/pdf"), ("TEACHER_SLIDE", PPTX_MIME)])
def test_index_accepts_supported_contract(pipeline: str, mime: str) -> None:
    """Args: pipeline/MIME fixture. Returns: None. Raises: AssertionError on schema drift."""
    request = DocumentIndexRequest(
        documentId="fixture-doc", documentVersion=1, pipelineType=pipeline,
        ownerId="fixture-owner", signedFileUrl="https://storage.invalid/fixture",
        mimeType=mime,
    )
    output = request.model_dump(by_alias=True)
    assert output["pipelineType"] == pipeline
    assert output["mimeType"] == mime
    assert output["ownerId"] == "fixture-owner"
    assert set(output) == {"documentId", "documentVersion", "pipelineType", "ownerId", "signedFileUrl", "mimeType"}


@pytest.mark.parametrize("pipeline,mime,owner", [
    ("PERSONAL_RAG", DOCX_MIME, "fixture-owner"),
    ("TEACHER_SLIDE", DOCX_MIME, "fixture-owner"),
    ("PERSONAL_RAG", PPTX_MIME, "fixture-owner"),
    ("TEACHER_SLIDE", "application/pdf", "fixture-owner"),
    ("PERSONAL_RAG", "application/pdf", None),
    ("PERSONAL_RAG", "application/pdf", " "),
])
def test_index_rejects_invalid_scope(pipeline: str, mime: str, owner: str | None) -> None:
    """Args: invalid synthetic metadata. Returns: None. Raises: AssertionError if accepted."""
    with pytest.raises(ValidationError, match="INVALID_INDEX_INPUT"):
        DocumentIndexRequest(
            documentId="fixture-doc", documentVersion=1, pipelineType=pipeline,
            ownerId=owner, signedFileUrl="https://storage.invalid/fixture", mimeType=mime,
        )


def test_citations_keep_page_and_slide_only() -> None:
    """Args: none; input: synthetic locations. Returns: None. Raises: AssertionError on drift."""
    for kind in ("PAGE", "SLIDE"):
        assert SourceLocation(kind=kind, value="1").model_dump() == {"kind": kind, "value": "1"}
    with pytest.raises(ValidationError):
        SourceLocation(kind="SECTION", value="1")


def test_slide_contract_still_uses_slide_fields() -> None:
    """Args: none; input: authorized PPTX fixture. Returns: None. Raises: AssertionError on drift."""
    request = SlideTutorAskRequest(
        userId="fixture-student", documentId="fixture-pptx", currentSlide=1,
        allowedSlideNumbers=[1, 2], question="Giải thích slide này",
    )
    output = request.model_dump(by_alias=True)
    assert output["currentSlide"] == 1
    assert output["allowedSlideNumbers"] == [1, 2]
    assert "pageNumber" not in output
