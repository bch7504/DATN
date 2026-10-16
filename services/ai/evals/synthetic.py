"""Tiny synthetic observations for checking metric formulas, not measuring a live model."""

from evals.metrics import EvaluationCase, PageReference


def synthetic_cases() -> tuple[EvaluationCase, ...]:
    """Build fixture observations.

    Args: none. Returns: positive, wrong-page, and unanswerable fixtures. Raises: none.
    """
    acid = PageReference(document_id="synthetic-acid", version=1, page=2)
    isolation = PageReference(document_id="synthetic-acid", version=1, page=3)
    foreign = PageReference(document_id="synthetic-other-owner", version=1, page=2)
    return (
        EvaluationCase(
            case_id="rag-acid",
            category="PERSONAL_RAG",
            answerable=True,
            expected_pages=(acid,),
            retrieved_pages=(acid,),
            cited_pages=(acid,),
            abstained=False,
        ),
        EvaluationCase(
            case_id="tutor-wrong-citation",
            category="COURSE_TUTOR",
            answerable=True,
            expected_pages=(isolation,),
            retrieved_pages=(isolation,),
            cited_pages=(foreign,),
            abstained=False,
        ),
        EvaluationCase(
            case_id="outside-evidence",
            category="NO_EVIDENCE",
            answerable=False,
            expected_pages=(),
            retrieved_pages=(),
            cited_pages=(),
            abstained=True,
        ),
    )
