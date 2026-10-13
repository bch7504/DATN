"""Narrow provider protocols used by grounded AI services."""

from typing import Protocol

from app.schemas.grounding import (
    GeneratedAnswer,
    GeneratedQuiz,
    QuizGenerationArgs,
    RetrievedEvidence,
)
from app.schemas.orchestration import IntentDecision


class EmbeddingClient(Protocol):
    """Contract for embedding query or document text with one index version."""

    async def embed(self, texts: tuple[str, ...]) -> tuple[tuple[float, ...], ...]:
        """Embed non-empty text values in input order.

        Args:
            texts: One or more non-blank text values.

        Returns:
            One fixed-dimension vector per input text, in the same order.

        Raises:
            ValueError: If input is empty or contains blank text.
            RuntimeError: If the provider fails or returns an invalid response.
        """


class AnswerGenerationClient(Protocol):
    """Contract for an answer generator constrained to retrieved evidence."""

    async def generate_answer(
        self,
        *,
        instruction: str,
        evidence: tuple[RetrievedEvidence, ...],
    ) -> GeneratedAnswer:
        """Generate an answer and select evidence identifiers it used.

        Args:
            instruction: User question or summary instruction.
            evidence: Authorized evidence chunks supplied by the service.

        Returns:
            Structured answer text and cited evidence identifiers.

        Raises:
            RuntimeError: If provider generation or schema validation fails.
        """


class QuizGenerationClient(Protocol):
    """Contract for producing an MCQ_SINGLE draft from authorized evidence."""

    async def generate_quiz(
        self,
        *,
        args: QuizGenerationArgs,
        evidence: tuple[RetrievedEvidence, ...],
    ) -> GeneratedQuiz:
        """Generate a structured quiz draft grounded in supplied evidence.

        Args:
            args: Trusted structured quiz settings supplied by Java.
            evidence: Authorized evidence chunks supplied by the service.

        Returns:
            Provider quiz output awaiting service-side grounding checks.

        Raises:
            RuntimeError: If provider generation or schema validation fails.
        """


class IntentClassificationClient(Protocol):
    """Contract for selecting one allowed Personal Assistant tool."""

    async def classify_intent(self, *, message: str) -> IntentDecision:
        """Classify a user message without executing any tool.

        Args:
            message: Untrusted free-form user message.

        Returns:
            Structured tool selection, confidence, and required arguments.

        Raises:
            RuntimeError: If provider generation or schema validation fails.
        """
