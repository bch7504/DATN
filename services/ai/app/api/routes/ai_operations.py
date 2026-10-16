"""Internal Personal Assistant and Course Material Tutor endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Header

from app.api.dependencies import (
    get_assistant_run_service,
    get_grounded_answer_service,
    get_idempotent_quiz_service,
)
from app.core.errors import ServiceError
from app.core.security import RequestContext, require_internal_request
from app.repositories.run_repository import RunConflictError
from app.schemas.api import (
    CourseMaterialAskRequest,
    CourseMaterialAskResponse,
    PersonalAssistantRunRequest,
    PersonalAssistantRunResponse,
    QuizGenerationRequest,
    QuizGenerationResponse,
    QuizGenerationStatus,
)
from app.services.assistant_runs import AssistantRunService
from app.services.grounded_generation import GroundedAnswerService
from app.services.idempotent_quiz import (
    IdempotentQuizGenerationService,
    QuizRunInProgressError,
)

router = APIRouter(tags=["ai-operations"])


@router.post(
    "/personal-assistant/runs",
    response_model=PersonalAssistantRunResponse,
)
async def run_personal_assistant(
    payload: PersonalAssistantRunRequest,
    context: Annotated[RequestContext, Depends(require_internal_request)],
    orchestrator: Annotated[
        AssistantRunService,
        Depends(get_assistant_run_service),
    ],
) -> PersonalAssistantRunResponse:
    """Run one authorized Personal PDF ask, summary, or Quiz operation.

    Args:
        payload: User, conversation, scope, history, and untrusted message.
        context: Authenticated service request context.
        orchestrator: Constrained single-agent service.

    Returns:
        Structured tool outcome with citations or Quiz draft when successful.

    Raises:
        ServiceError: If scope/input is invalid or an AI dependency fails.
    """

    try:
        result = await orchestrator.execute(
            request_id=context.request_id,
            conversation_id=payload.conversation_id,
            message=payload.message,
            scope=payload.to_scope(),
            history=payload.history,
        )
    except QuizRunInProgressError as error:
        raise ServiceError(
            status_code=409,
            code="ASSISTANT_RUN_IN_PROGRESS",
            message="This assistant request is already in progress",
        ) from error
    except RunConflictError as error:
        raise ServiceError(
            status_code=409,
            code="IDEMPOTENCY_CONFLICT",
            message="Request identity was reused for another payload",
        ) from error
    except ValueError as error:
        raise ServiceError(
            status_code=422,
            code="INVALID_AI_REQUEST",
            message="Personal Assistant request is invalid",
        ) from error
    except RuntimeError as error:
        raise ServiceError(
            status_code=502,
            code="AI_OPERATION_FAILED",
            message="Personal Assistant operation failed",
        ) from error
    return PersonalAssistantRunResponse(request_id=context.request_id, result=result)


@router.post(
    "/course-materials/ask",
    response_model=CourseMaterialAskResponse,
)
async def ask_course_material(
    payload: CourseMaterialAskRequest,
    context: Annotated[RequestContext, Depends(require_internal_request)],
    answer_service: Annotated[
        GroundedAnswerService,
        Depends(get_grounded_answer_service),
    ],
) -> CourseMaterialAskResponse:
    """Answer a Student question from one authorized Course Material PDF.

    Args:
        payload: Student, Course Offering, PDF, page scope, and question.
        context: Authenticated service request context.
        answer_service: Grounded answer service with current-page retrieval bias.

    Returns:
        ANSWERED with page citations, or NO_EVIDENCE.

    Raises:
        ServiceError: If scope/input is invalid or an AI dependency fails.
    """

    try:
        result = await answer_service.answer(
            instruction=payload.question,
            scope=payload.to_scope(),
        )
    except ValueError as error:
        raise ServiceError(
            status_code=422,
            code="INVALID_AI_REQUEST",
            message="Course Material question is invalid",
        ) from error
    except RuntimeError as error:
        raise ServiceError(
            status_code=502,
            code="AI_OPERATION_FAILED",
            message="Course Material Tutor operation failed",
        ) from error
    return CourseMaterialAskResponse(request_id=context.request_id, result=result)


@router.post(
    "/quizzes/generate",
    response_model=QuizGenerationResponse,
)
async def generate_quiz(
    payload: QuizGenerationRequest,
    context: Annotated[RequestContext, Depends(require_internal_request)],
    idempotency_key: Annotated[
        str,
        Header(alias="Idempotency-Key", min_length=8, max_length=255),
    ],
    service: Annotated[
        IdempotentQuizGenerationService,
        Depends(get_idempotent_quiz_service),
    ],
) -> QuizGenerationResponse:
    """Generate or replay one grounded Student/Teacher MCQ_SINGLE draft.

    Args:
        payload: Actor, mode, authorized PDF scope, prompt, and trusted options.
        context: Authenticated service request context.
        idempotency_key: Stable Java operation key preventing duplicate Quiz runs.
        service: Idempotent grounded Quiz generation service.

    Returns:
        DRAFT_CREATED with a structured Quiz, or NO_EVIDENCE.

    Raises:
        ServiceError: If another run is active, input is invalid, or an AI
            dependency fails.
    """

    try:
        quiz = await service.generate(
            request_id=context.request_id,
            idempotency_key=idempotency_key,
            actor_id=payload.actor_id,
            instruction=payload.instruction,
            args=payload.generation_args,
            scope=payload.to_scope(),
        )
    except QuizRunInProgressError as error:
        raise ServiceError(
            status_code=409,
            code="QUIZ_GENERATION_IN_PROGRESS",
            message="Quiz generation with this idempotency key is in progress",
        ) from error
    except RunConflictError as error:
        raise ServiceError(
            status_code=409,
            code="IDEMPOTENCY_CONFLICT",
            message="Idempotency key input or authorized scope changed",
        ) from error
    except ValueError as error:
        raise ServiceError(
            status_code=422,
            code="INVALID_AI_REQUEST",
            message="Quiz generation request is invalid",
        ) from error
    except RuntimeError as error:
        raise ServiceError(
            status_code=502,
            code="AI_OPERATION_FAILED",
            message="Quiz generation operation failed",
        ) from error
    return QuizGenerationResponse(
        request_id=context.request_id,
        status=(
            QuizGenerationStatus.DRAFT_CREATED
            if quiz is not None
            else QuizGenerationStatus.NO_EVIDENCE
        ),
        quiz=quiz,
    )
