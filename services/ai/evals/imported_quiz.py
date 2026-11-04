"""Live, content-free evaluation for importing Student Quiz text."""

from pydantic import BaseModel, Field

from app.clients.openrouter import OpenRouterClient
from app.core.config import Settings
from app.schemas.grounding import QuizDraft, QuizDraftSource
from app.services.imported_quiz import ImportedQuizService

VALID_IMPORT_TEXT = """Tên đề: Cổng logic cơ bản
Câu 1. Cổng AND cho đầu ra bằng 1 khi nào?
A. Ít nhất một đầu vào bằng 1
B. Tất cả đầu vào bằng 1
C. Tất cả đầu vào bằng 0
D. Hai đầu vào khác nhau
Đáp án: B
Giải thích: Nội dung đề xác định cổng AND chỉ bằng 1 khi mọi đầu vào bằng 1.

Câu 2. Cổng NOT thực hiện phép nào?
A. Phép đảo logic
B. Phép cộng số học
C. Phép nhân số học
D. Phép dịch bit
Đáp án: A
Giải thích: Nội dung đề xác định cổng NOT đảo giá trị logic đầu vào.
"""

INCOMPLETE_IMPORT_TEXT = """Câu 1. Cổng OR cho đầu ra bằng 1 khi nào?
A. Có ít nhất một đầu vào bằng 1
B. Tất cả đầu vào bằng 0
C. Chỉ có hai đầu vào
D. Không có đầu vào
"""


class ImportedQuizEvaluationReport(BaseModel):
    """Safe metrics for two synthetic live import cases."""

    model: str = Field(min_length=1)
    complete_case_passed: bool
    clarification_case_passed: bool
    question_count: int = Field(ge=0)
    all_questions_have_four_options: bool
    all_questions_have_one_correct_index: bool
    citations_are_empty: bool
    source_type: str
    passed: bool


async def run_live_imported_quiz_evaluation() -> ImportedQuizEvaluationReport:
    """Call OpenRouter for a complete and an incomplete synthetic Quiz text.

    Args:
        None. Runtime configuration is loaded by `Settings` without exposing values.

    Returns:
        Content-free schema and clarification metrics for both live provider calls.

    Raises:
        ValueError: If the OpenRouter key is not configured.
        RuntimeError: If provider output is absent, invalid, or violates import policy.
        openai.APIError: If the provider request fails.
    """

    settings = Settings(INTERNAL_SERVICE_TOKEN="live-imported-quiz-evaluation-token")
    if settings.openrouter_api_key is None:
        raise ValueError("OPENROUTER_API_KEY must be configured in root .env or the process")
    provider = OpenRouterClient.from_settings(settings)
    service = ImportedQuizService(client=provider)
    try:
        complete = await service.import_text(source_text=VALID_IMPORT_TEXT)
        clarification = await service.import_text(source_text=INCOMPLETE_IMPORT_TEXT)
    finally:
        await provider.close()

    complete_quiz = complete if isinstance(complete, QuizDraft) else None
    complete_case_passed = complete_quiz is not None and len(complete_quiz.questions) == 2
    clarification_case_passed = isinstance(clarification, str) and bool(clarification.strip())
    questions = complete_quiz.questions if complete_quiz is not None else ()
    all_four = bool(questions) and all(len(question.options) == 4 for question in questions)
    all_one_index = bool(questions) and all(
        0 <= question.correct_option_index <= 3 for question in questions
    )
    citations_empty = bool(questions) and all(not question.citations for question in questions)
    source_type = complete_quiz.source_type.value if complete_quiz is not None else "INVALID"
    passed = (
        complete_case_passed
        and clarification_case_passed
        and all_four
        and all_one_index
        and citations_empty
        and source_type == QuizDraftSource.IMPORTED_TEXT.value
    )
    return ImportedQuizEvaluationReport(
        model=settings.openrouter_chat_model,
        complete_case_passed=complete_case_passed,
        clarification_case_passed=clarification_case_passed,
        question_count=len(questions),
        all_questions_have_four_options=all_four,
        all_questions_have_one_correct_index=all_one_index,
        citations_are_empty=citations_empty,
        source_type=source_type,
        passed=passed,
    )
