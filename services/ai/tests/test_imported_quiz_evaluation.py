"""Schema contract for the content-free imported Quiz evaluation report."""

import pytest
from pydantic import ValidationError

from evals.imported_quiz import ImportedQuizEvaluationReport


def test_imported_quiz_report_accepts_only_safe_metrics() -> None:
    """The report contains schema outcomes and no generated Quiz content."""

    report = ImportedQuizEvaluationReport(
        model="provider-model",
        complete_case_passed=True,
        clarification_case_passed=True,
        question_count=2,
        all_questions_have_four_options=True,
        all_questions_have_one_correct_index=True,
        citations_are_empty=True,
        source_type="IMPORTED_TEXT",
        passed=True,
    )

    assert "questions" not in report.model_dump()
    assert "title" not in report.model_dump()
    assert report.passed is True


def test_imported_quiz_report_rejects_negative_question_count() -> None:
    """Invalid safe metrics fail validation before crossing the CLI boundary."""

    with pytest.raises(ValidationError):
        ImportedQuizEvaluationReport(
            model="provider-model",
            complete_case_passed=False,
            clarification_case_passed=False,
            question_count=-1,
            all_questions_have_four_options=False,
            all_questions_have_one_correct_index=False,
            citations_are_empty=False,
            source_type="INVALID",
            passed=False,
        )
