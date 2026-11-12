"""Contract tests for a Slide PDF with Teacher-authorized supporting PDFs."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.api import CourseMaterialAskRequest


def _payload() -> dict[str, object]:
    """Return a valid schema-v5 Course Material Tutor payload.

    Returns:
        A synthetic primary-slide and supporting-PDF request.
    """

    slide_id = uuid4()
    return {
        "userId": str(uuid4()),
        "courseOfferingId": str(uuid4()),
        "documents": [
            {
                "documentId": str(slide_id),
                "documentVersion": 1,
                "sourceType": "COURSE_MATERIAL_PDF",
                "allowedPages": [1, 2],
            },
            {
                "documentId": str(uuid4()),
                "documentVersion": 2,
                "sourceType": "COURSE_MATERIAL_PDF",
            },
        ],
        "currentDocumentId": str(slide_id),
        "currentPageNumber": 1,
        "question": "Giải thích cổng logic trên trang này.",
    }


def test_accepts_primary_slide_and_supporting_pdf_scope() -> None:
    """A valid multi-document scope reaches the domain boundary unchanged."""

    request = CourseMaterialAskRequest.model_validate(_payload())

    assert len(request.to_scope().documents) == 2
    assert request.to_scope().current_document_id == request.current_document_id


def test_rejects_current_document_outside_authorized_scope() -> None:
    """The current slide must be one of the Java-authorized documents."""

    payload = _payload()
    payload["currentDocumentId"] = str(uuid4())

    with pytest.raises(ValidationError, match="current document must be inside documents"):
        CourseMaterialAskRequest.model_validate(payload)


def test_rejects_duplicate_document_scope() -> None:
    """A duplicated PDF cannot bias retrieval by appearing twice."""

    payload = _payload()
    documents = payload["documents"]
    assert isinstance(documents, list)
    documents.append(documents[0])

    with pytest.raises(ValidationError, match="documents must be unique"):
        CourseMaterialAskRequest.model_validate(payload)
