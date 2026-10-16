"""Offline metric smoke runner: python -m evals --synthetic."""

import argparse
from collections.abc import Sequence

from evals.metrics import evaluate
from evals.synthetic import synthetic_cases


def main(argv: Sequence[str] | None = None) -> int:
    """Print clearly labeled synthetic metric output without files or network.

    Args: argv: optional CLI arguments; --synthetic is mandatory; --k defaults to 8.
    Returns: 0 after printing JSON; no model calls or persistence.
    Raises: SystemExit for invalid args; ValueError for invalid k.
    """
    parser = argparse.ArgumentParser(description="Synthetic formula checks; not model evaluation")
    parser.add_argument("--synthetic", action="store_true", required=True)
    parser.add_argument("--k", type=int, default=8)
    args = parser.parse_args(argv)
    print("SYNTHETIC FIXTURE RESULTS — NOT LIVE MODEL QUALITY")
    print(evaluate(synthetic_cases(), k=args.k).model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
