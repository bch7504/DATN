package com.studyflow.integration.ai;

import com.studyflow.integration.ai.AiContracts.CourseMaterialAskRequest;
import com.studyflow.integration.ai.AiContracts.CourseMaterialAskResponse;
import com.studyflow.integration.ai.AiContracts.DeindexDocumentRequest;
import com.studyflow.integration.ai.AiContracts.HealthResponse;
import com.studyflow.integration.ai.AiContracts.IndexDocumentRequest;
import com.studyflow.integration.ai.AiContracts.JobAcceptedResponse;
import com.studyflow.integration.ai.AiContracts.JobResponse;
import com.studyflow.integration.ai.AiContracts.PersonalAssistantRunRequest;
import com.studyflow.integration.ai.AiContracts.PersonalAssistantRunResponse;
import com.studyflow.integration.ai.AiContracts.QuizGenerationRequest;
import com.studyflow.integration.ai.AiContracts.QuizGenerationResponse;
import java.util.UUID;

/** Internal-only Java gateway to Python schema version 3. */
public interface AiServiceClient {
    /** Args: validated request, trace ID, stable operation key. Output: queued index job. Errors: {@link AiServiceException}. */
    JobAcceptedResponse indexDocument(IndexDocumentRequest request, String requestId, String idempotencyKey);

    /** Args: exact index identity, trace ID, stable operation key. Output: queued deindex job. Errors: {@link AiServiceException}. */
    JobAcceptedResponse deindexDocument(DeindexDocumentRequest request, String requestId, String idempotencyKey);

    /** Args: Python job ID and new trace ID. Output: safe job state. Errors: {@link AiServiceException}. */
    JobResponse getJob(UUID jobId, String requestId);

    /** Args: authorized Personal PDF scope and trace ID. Output: structured assistant result. Errors: {@link AiServiceException}. */
    PersonalAssistantRunResponse runPersonalAssistant(PersonalAssistantRunRequest request, String requestId);

    /** Args: authorized Course Material scope and trace ID. Output: grounded answer/abstention. Errors: {@link AiServiceException}. */
    CourseMaterialAskResponse askCourseMaterial(CourseMaterialAskRequest request, String requestId);

    /** Args: authorized Quiz request, trace ID, stable generation key. Output: grounded draft/abstention. Errors: {@link AiServiceException}. */
    QuizGenerationResponse generateQuiz(QuizGenerationRequest request, String requestId, String idempotencyKey);

    /** Args: trace ID. Output: non-sensitive health response. Errors: {@link AiServiceException}. */
    HealthResponse health(String requestId);
}
