"""Evaluation CLI for synthetic formulas or locked Vietnamese Hybrid RAG cases."""

import argparse
import asyncio
import sys
from collections.abc import Sequence
from pathlib import Path

from evals.imported_quiz import run_live_imported_quiz_evaluation
from evals.index_local import DEFAULT_INDEX_MANIFEST, run_local_evaluation_index
from evals.metrics import evaluate
from evals.synthetic import synthetic_cases
from evals.vietnamese import DEFAULT_DATASET, LiveEvaluationStageError, run_live_evaluation
from evals.vision import run_live_vision_evaluation


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
    mode.add_argument("--live-vision", action="store_true")
    mode.add_argument("--index-local-evaluation", action="store_true")
    mode.add_argument("--live-imported-quiz", action="store_true")
    parser.add_argument("--k", type=int, default=8)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--document-dir", type=Path)
    parser.add_argument("--file-pattern", default="*.pdf")
    parser.add_argument("--max-files", type=int, default=20)
    parser.add_argument("--max-vision-pages", type=int, default=100)
    parser.add_argument("--index-manifest", type=Path, default=DEFAULT_INDEX_MANIFEST)
    parser.add_argument("--index-concurrency", type=int, default=2)
    parser.add_argument("--index-document", action="append")
    args = parser.parse_args(argv)
    if args.synthetic:
        print("SYNTHETIC FIXTURE RESULTS — NOT LIVE MODEL QUALITY")
        print(evaluate(synthetic_cases(), k=args.k).model_dump_json(indent=2))
        return 0
    try:
        if args.live_imported_quiz:
            result = asyncio.run(run_live_imported_quiz_evaluation())
        elif args.index_local_evaluation:
            if args.document_dir is None:
                raise ValueError("--document-dir is required with --index-local-evaluation")
            result = asyncio.run(
                run_local_evaluation_index(
                    document_dir=args.document_dir,
                    manifest_path=args.index_manifest,
                    max_concurrent_documents=args.index_concurrency,
                    document_names=(
                        tuple(args.index_document) if args.index_document is not None else None
                    ),
                )
            )
        elif args.live_vision:
            if args.document_dir is None:
                raise ValueError("--document-dir is required with --live-vision")
            result = asyncio.run(
                run_live_vision_evaluation(
                    document_dir=args.document_dir,
                    file_pattern=args.file_pattern,
                    max_files=args.max_files,
                    max_vision_pages_per_document=args.max_vision_pages,
                )
            )
        else:
            result = asyncio.run(
                run_live_evaluation(dataset_path=args.dataset, retrieval_limit=args.k)
            )
    except LiveEvaluationStageError as error:
        print(
            "LIVE_EVALUATION_STAGE_FAILED: "
            f"case={error.case_id} stage={error.stage} type={error.error_type}",
            file=sys.stderr,
        )
        return 1
    except Exception as error:  # noqa: BLE001 - CLI boundary must not expose provider/DB details.
        print(
            f"LIVE_EVALUATION_FAILED: {type(error).__name__}",
            file=sys.stderr,
        )
        return 1
    if args.live_imported_quiz:
        print("LIVE IMPORTED QUIZ RESULTS — QUIZ CONTENT OMITTED")
        print(result.model_dump_json(indent=2))
        return 0 if result.passed else 2
    if args.index_local_evaluation:
        print("LOCAL EVALUATION INDEX RESULTS — DOCUMENT CONTENT OMITTED")
        print(result.model_dump_json(indent=2))
        return 0 if result.passed else 2
    if args.live_vision:
        print("LIVE PAGE-LEVEL VISION RESULTS — DOCUMENT CONTENT OMITTED")
        print(result.model_dump_json(indent=2))
        return 0 if result.passed else 2
    print("LIVE VIETNAMESE HYBRID RAG RESULTS — HUMAN GROUNDEDNESS STILL REQUIRED")
    print(result.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
