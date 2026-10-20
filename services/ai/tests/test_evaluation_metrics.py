"""Verify evaluation denominators and distinguish citations from factual support."""

import pytest

from evals.metrics import EvaluationCase, PageReference, evaluate
from evals.synthetic import synthetic_cases


def test_wrong_source_is_not_a_correct_citation() -> None:
    """Citation precision must penalize another owner's source even if page numbers match."""
    report = evaluate(synthetic_cases())
    assert report.retrieval_recall_at_k == 1
    assert report.citation_location_precision == 0.5
    assert report.human_groundedness is None


def test_zero_citations_do_not_report_perfect_precision() -> None:
    """Undefined precision/groundedness must remain null rather than masquerade as quality."""
    case = EvaluationCase(
        case_id="abstain",
        category="NO_EVIDENCE",
        answerable=False,
        expected_pages=(),
        retrieved_pages=(),
        cited_pages=(),
        abstained=True,
    )
    report = evaluate((case,))
    assert report.citation_location_precision is None
    assert report.retrieval_recall_at_k is None
    assert report.no_evidence_accuracy == 1


def test_duplicate_retrieval_does_not_inflate_recall_and_versions_must_match() -> None:
    """Recall compares distinct versioned pages, not raw hit counts."""
    source = PageReference(document_id="d", version=2, page=1)
    old = PageReference(document_id="d", version=1, page=1)
    case = EvaluationCase(
        case_id="versions",
        category="RAG",
        answerable=True,
        expected_pages=(source,),
        retrieved_pages=(old, old, source),
        cited_pages=(old,),
        abstained=False,
        claims_checked=3,
        claims_supported=1,
    )
    report = evaluate((case,), k=2)
    assert report.retrieval_recall_at_k == 0
    assert report.citation_location_precision == 0
    assert report.human_groundedness == pytest.approx(1 / 3)
