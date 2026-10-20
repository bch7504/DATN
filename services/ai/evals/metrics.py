"""Separate retrieval, citation-location, abstention, and human grounding measurements."""

from statistics import mean

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PageReference(BaseModel):
    """Synthetic source location; separate versions never count as the same evidence."""

    model_config = ConfigDict(frozen=True, extra="forbid")
    document_id: str = Field(min_length=1)
    version: int = Field(ge=1)
    page: int = Field(ge=1)


class EvaluationCase(BaseModel):
    """One observed result compared with independently labeled expected evidence."""

    model_config = ConfigDict(extra="forbid")
    case_id: str = Field(min_length=1)
    category: str = Field(min_length=1)
    answerable: bool
    expected_pages: tuple[PageReference, ...]
    retrieved_pages: tuple[PageReference, ...]
    cited_pages: tuple[PageReference, ...]
    abstained: bool
    claims_supported: int | None = Field(default=None, ge=0)
    claims_checked: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_labels(self) -> "EvaluationCase":
        """Check labels. Args: self. Returns: self. Raises: ValueError for inconsistent labels."""
        if self.answerable and not self.expected_pages:
            raise ValueError("Answerable cases require independently labeled expected pages")
        if (self.claims_supported is None) != (self.claims_checked is None):
            raise ValueError("Human claim counts must be supplied together")
        if self.claims_supported is not None and self.claims_supported > self.claims_checked:
            raise ValueError("Supported claims cannot exceed checked claims")
        return self


class EvaluationReport(BaseModel):
    """Aggregate measurements; undefined metrics remain null instead of artificial 100%."""

    cases: int
    retrieval_recall_at_k: float | None
    citation_location_precision: float | None
    no_evidence_accuracy: float | None
    human_groundedness: float | None
    k: int


def evaluate(cases: tuple[EvaluationCase, ...], *, k: int = 8) -> EvaluationReport:
    """Calculate distinct metrics without using an LLM to grade itself.

    Args: cases: labeled synthetic observations; k: positive retrieval cut-off.
    Returns: Macro recall, micro citation precision, abstention accuracy and optional human score.
    Raises: ValueError for empty cases or invalid k.
    """
    if not cases or k < 1:
        raise ValueError("Provide cases and a positive k")
    recalls: list[float] = []
    valid_citations = citation_count = supported = checked = 0
    for case in cases:
        expected = set(case.expected_pages)
        if case.answerable:
            recalls.append(len(set(case.retrieved_pages[:k]) & expected) / len(expected))
        citations = set(case.cited_pages)
        citation_count += len(citations)
        valid_citations += len(citations & expected)
        if case.claims_checked is not None and case.claims_supported is not None:
            checked += case.claims_checked
            supported += case.claims_supported
    return EvaluationReport(
        cases=len(cases),
        k=k,
        retrieval_recall_at_k=mean(recalls) if recalls else None,
        citation_location_precision=valid_citations / citation_count if citation_count else None,
        no_evidence_accuracy=mean(case.abstained != case.answerable for case in cases),
        human_groundedness=supported / checked if checked else None,
    )
