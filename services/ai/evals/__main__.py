"""Evaluation CLI for synthetic formulas or locked Vietnamese Hybrid RAG cases."""

import argparse
import asyncio
import sys
from collections.abc import Sequence
from pathlib import Path

from evals.metrics import evaluate
from evals.synthetic import synthetic_cases
from evals.vietnamese import DEFAULT_DATASET, run_live_evaluation


def main(argv: Sequence[str] | None = None) -> int:
    """Run exactly one explicit evaluation mode.

    Args:
        argv: Optional CLI arguments. Choose synthetic or live Vietnamese mode.

    Returns:
        Zero after printing a structured report.

    Raises:
        SystemExit: If CLI arguments are invalid.
        ValueError: If dataset, environment, or retrieval limits are invalid.
        RuntimeError: If a live dependency fails.
    """
    parser = argparse.ArgumentParser(description="StudyFlow AI evaluation")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--synthetic", action="store_true")
    mode.add_argument("--live-vietnamese", action="store_true")
    parser.add_argument("--k", type=int, default=8)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    args = parser.parse_args(argv)
    if args.synthetic:
        print("SYNTHETIC FIXTURE RESULTS — NOT LIVE MODEL QUALITY")
        print(evaluate(synthetic_cases(), k=args.k).model_dump_json(indent=2))
        return 0
    try:
        result = asyncio.run(run_live_evaluation(dataset_path=args.dataset, retrieval_limit=args.k))
    except Exception as error:  # noqa: BLE001 - CLI boundary must not expose provider/DB details.
        print(
            f"LIVE_EVALUATION_FAILED: {type(error).__name__}",
            file=sys.stderr,
        )
        return 1
    print("LIVE VIETNAMESE HYBRID RAG RESULTS — HUMAN GROUNDEDNESS STILL REQUIRED")
    print(result.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
