"""Validate Quiz drafts imported from Student-supplied text."""

from app.clients.protocols import ImportedQuizClient
from app.schemas.grounding import QuizDraft, QuizDraftSource, QuizQuestionDraft


class ImportedQuizService:
    """Convert untrusted pasted text into a review-required MCQ_SINGLE draft."""

    def __init__(self, *, client: ImportedQuizClient) -> None:
        """Create the import tool.

        Args: client, structured provider. Returns: None. Raises: none.
        """
        self._client = client

    async def import_text(self, *, source_text: str) -> QuizDraft | str:
        """Parse one bounded text block without inventing PDF citations.

        Args:
            source_text: Student-supplied text, 20 to 4,000 characters.

        Returns:
            An `IMPORTED_TEXT` Quiz draft, or one clarification question when
            required data is absent.

        Raises:
            ValueError: If text is too short/long or provider questions are duplicated.
            RuntimeError: If the structured provider fails.
        """

        normalized = source_text.strip()
        if not 20 <= len(normalized) <= 4000:
            raise ValueError("import text must contain between 20 and 4000 characters")
        imported = await self._client.import_quiz(source_text=normalized)
        if imported.clarification_question is not None:
            return imported.clarification_question
        if imported.title is None or not imported.questions:
            raise RuntimeError("import provider returned an incomplete structured result")
        normalized_questions = {
            question.question.strip().casefold() for question in imported.questions
        }
        if len(normalized_questions) != len(imported.questions):
            raise ValueError("imported Quiz contains duplicate questions")
        return QuizDraft(
            source_type=QuizDraftSource.IMPORTED_TEXT,
            title=imported.title,
            questions=tuple(
                QuizQuestionDraft(
                    question=question.question,
                    options=question.options,
                    correct_option_index=question.correct_option_index,
                    explanation=question.explanation,
                    citations=(),
                )
                for question in imported.questions
            ),
        )
