"""Synthetic tests for the content-free live Vision evaluation report."""

from io import BytesIO

import pytest
from reportlab.pdfgen import canvas

from evals.vision import evaluate_vision_documents


class SuccessfulVisionClient:
    """Return a deterministic caption for synthetic vector pages."""

    async def describe_image(
        self,
        *,
        image_bytes: bytes,
        mime_type: str = "image/png",
        context: str = "",
    ) -> str:
        """Validate the page render and return a synthetic caption.

        Args:
            image_bytes: Rendered PNG page.
            mime_type: Expected PNG type.
            context: Synthetic text-layer context.

        Returns:
            Fixed caption without storing the supplied content.

        Raises:
            AssertionError: If the parser violates the Vision input contract.
        """

        assert image_bytes.startswith(b"\x89PNG")
        assert mime_type == "image/png"
        assert context
        return "Sơ đồ vector tổng hợp."


class OversizedVisionClient:
    """Return a syntactically valid but over-budget caption."""

    async def describe_image(
        self,
        *,
        image_bytes: bytes,
        mime_type: str = "image/png",
        context: str = "",
    ) -> str:
        """Return an oversized caption without retaining inputs.

        Args:
            image_bytes: Rendered PNG page.
            mime_type: Expected PNG type.
            context: Synthetic text-layer context.

        Returns:
            Caption exceeding the parser's default character budget.

        Raises:
            AssertionError: If the input is not the expected bounded render.
        """

        assert image_bytes.startswith(b"\x89PNG")
        assert mime_type == "image/png"
        assert context
        return "x" * 4_001


def _synthetic_vector_pdf() -> bytes:
    """Create one safe synthetic vector slide with a text layer."""

    output = BytesIO()
    document = canvas.Canvas(output)
    document.drawString(72, 760, "Synthetic digital logic")
    document.rect(72, 620, 180, 80)
    document.showPage()
    document.save()
    return output.getvalue()


@pytest.mark.anyio
async def test_live_vision_report_omits_document_content(tmp_path) -> None:
    """The report exposes only metrics and a file name, never text or captions."""

    document = tmp_path / "synthetic.pdf"
    document.write_bytes(_synthetic_vector_pdf())

    report = await evaluate_vision_documents(
        document_dir=tmp_path,
        vision_client=SuccessfulVisionClient(),
        vision_model="synthetic/model",
    )

    assert report.passed is True
    assert report.document_count == 1
    assert report.page_count == 1
    assert report.provider_calls == 1
    assert report.successful_captions == 1
    assert report.layout_block_count >= 1
    assert report.table_count == 0
    serialized = report.model_dump_json()
    assert "Synthetic digital logic" not in serialized
    assert "Sơ đồ vector tổng hợp" not in serialized


@pytest.mark.anyio
async def test_live_vision_report_rejects_provider_caption_outside_budget(tmp_path) -> None:
    """Only captions accepted by the parser count as successful enrichment."""

    document = tmp_path / "synthetic.pdf"
    document.write_bytes(_synthetic_vector_pdf())

    report = await evaluate_vision_documents(
        document_dir=tmp_path,
        vision_client=OversizedVisionClient(),
        vision_model="synthetic/model",
    )

    assert report.passed is False
    assert report.provider_calls == 1
    assert report.successful_captions == 0
    assert report.failed_captions == 1
    assert report.documents[0].error_code == "VISION_CAPTION_REJECTED"
