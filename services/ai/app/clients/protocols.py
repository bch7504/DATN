"""Narrow provider protocols used by grounded AI services."""

from typing import Protocol

from app.schemas.grounding import (
    GeneratedAnswer,
    GeneratedQuiz,
    ImportedQuizResult,
    QuizGenerationArgs,
    RerankDecision,
    RetrievedEvidence,
)
from app.schemas.orchestration import ConversationTurn, IntentDecision


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


class EvidenceRerankClient(Protocol):
    """Contract for an LLM that scores only already-authorized retrieval candidates."""

    async def score_evidence(
        self,
        *,
        query: str,
        evidence: tuple[RetrievedEvidence, ...],
    ) -> RerankDecision:
        """Score every candidate without answering or changing scope.

        Args:
            query: Standalone retrieval query after conversational rewriting.
            evidence: One to one hundred authorized hybrid-search candidates.

        Returns:
            Exactly one relevance score for every supplied evidence identifier.

        Raises:
            ValueError: If query or evidence is invalid.
            RuntimeError: If provider output is incomplete, duplicated, or outside the input IDs.
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

    async def contextualize_query(
        self,
        *,
        question: str,
        history: tuple[ConversationTurn, ...],
        current_page_number: int,
    ) -> str:
        """Rewrite a follow-up question into one standalone retrieval query.

        Args:
            question: Current non-blank user question.
            history: At most twelve prior sanitized conversation turns.
            current_page_number: Trusted 1-based Viewer page context.

        Returns:
            One non-blank standalone query in the user's language.

        Raises:
            ValueError: If inputs violate the bounded working-memory contract.
            RuntimeError: If provider output is missing or invalid.
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


class ImportedQuizClient(Protocol):
    """Contract for parsing Student-supplied Quiz text without PDF grounding."""

    async def import_quiz(self, *, source_text: str) -> ImportedQuizResult:
        """Parse a bounded text block into an MCQ_SINGLE draft.

        Args:
            source_text: Untrusted Student text containing questions, four options and answers.

        Returns:
            Structured imported Quiz or one clarification question, with no citation fields.

        Raises:
            ValueError: If source text is blank or outside the bounded size.
            RuntimeError: If provider output is missing or invalid.
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


class VisionCaptionClient(Protocol):
    """Contract for describing technical diagrams, circuits, and formulas using Vision LLM."""

    async def describe_image(
        self,
        *,
        image_bytes: bytes,
        mime_type: str = "image/png",
        context: str = "",
    ) -> str:
        """Describe visual diagrams, circuits, or formulas in technical Vietnamese/LaTeX.

        Args:
            image_bytes: Raw image binary data.
            mime_type: MIME type of the image (e.g. image/png, image/jpeg).
            context: Optional textual context around the image (page title, preceding paragraph).

        Returns:
            Structured technical description in Vietnamese with LaTeX formulas for RAG indexing.

        Raises:
            RuntimeError: If the vision provider API fails.
        """
