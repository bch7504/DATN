"""Validate the locked Vietnamese quality dataset without network calls."""

import json

import pytest
from pydantic import ValidationError

from evals.vietnamese import DEFAULT_DATASET, ValidationDataset, load_dataset


def test_locked_vietnamese_dataset_has_answerable_and_abstention_cases() -> None:
    """The acceptance set must cover retrieval and NO_EVIDENCE in Vietnamese."""
    dataset = load_dataset()
    assert dataset.language == "vi"
    assert len(dataset.cases) == 12
    assert any(case.answerable for case in dataset.cases)
    assert any(not case.answerable for case in dataset.cases)
    assert len({case.document_id for case in dataset.cases}) == 4


def test_dataset_rejects_an_unanswerable_case_with_expected_pages() -> None:
    """Independent labels cannot mark a case unanswerable while supplying source pages."""
    raw = json.loads(DEFAULT_DATASET.read_text(encoding="utf-8"))
    raw["cases"][0]["answerable"] = False
    with pytest.raises(ValidationError, match="unanswerable"):
        ValidationDataset.model_validate(raw)
