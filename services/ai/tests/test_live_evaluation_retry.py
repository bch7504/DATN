"""Safe retry contracts for the live evaluation runner."""

import pytest

from evals.vietnamese import LiveEvaluationStageError, _run_evaluation_stage


@pytest.mark.anyio
async def test_live_evaluation_stage_retries_once_then_returns() -> None:
    """A transient side-effect-free evaluation failure receives one bounded retry."""

    calls = 0

    async def operation() -> str:
        """Return after one synthetic transient failure."""

        nonlocal calls
        calls += 1
        if calls == 1:
            raise RuntimeError("synthetic sensitive provider detail")
        return "PASSED"

    assert (
        await _run_evaluation_stage(
            case_id="KTS-001",
            stage="RETRIEVAL_RERANK",
            operation=operation,
        )
        == "PASSED"
    )
    assert calls == 2


@pytest.mark.anyio
async def test_live_evaluation_stage_exposes_only_safe_failure_fields() -> None:
    """Provider messages are excluded from the stable evaluation exception text."""

    async def operation() -> None:
        """Always fail with a message that must not cross the CLI boundary."""

        raise RuntimeError("synthetic sensitive provider detail")

    with pytest.raises(LiveEvaluationStageError) as captured:
        await _run_evaluation_stage(
            case_id="KTS-002",
            stage="ANSWER_PIPELINE",
            operation=operation,
        )

    assert str(captured.value) == "KTS-002:ANSWER_PIPELINE:RuntimeError"
    assert "sensitive" not in str(captured.value)
