package com.studyflow.integration.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.integration.ai.AiContracts.AnswerStatus;
import com.studyflow.integration.ai.AiContracts.AssistantRunResult;
import com.studyflow.integration.ai.AiContracts.AssistantRunStatus;
import com.studyflow.integration.ai.AiContracts.AuthorizedDocument;
import com.studyflow.integration.ai.AiContracts.Citation;
import com.studyflow.integration.ai.AiContracts.CourseMaterialAskRequest;
import com.studyflow.integration.ai.AiContracts.CourseMaterialAskResponse;
import com.studyflow.integration.ai.AiContracts.DeindexDocumentRequest;
import com.studyflow.integration.ai.AiContracts.ErrorEnvelope;
import com.studyflow.integration.ai.AiContracts.HealthResponse;
import com.studyflow.integration.ai.AiContracts.IndexDocumentRequest;
import com.studyflow.integration.ai.AiContracts.JobAcceptedResponse;
import com.studyflow.integration.ai.AiContracts.JobResponse;
import com.studyflow.integration.ai.AiContracts.JobStatus;
import com.studyflow.integration.ai.AiContracts.PersonalAssistantRunRequest;
import com.studyflow.integration.ai.AiContracts.PersonalAssistantRunResponse;
import com.studyflow.integration.ai.AiContracts.QuizDraft;
import com.studyflow.integration.ai.AiContracts.QuizGenerationRequest;
import com.studyflow.integration.ai.AiContracts.QuizGenerationResponse;
import com.studyflow.integration.ai.AiContracts.QuizGenerationStatus;
import com.studyflow.integration.ai.AiContracts.QuizQuestionDraft;
import java.net.URI;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/** HTTP implementation of the internal schema-v3 AI contract. */
public final class HttpAiServiceClient implements AiServiceClient {
    private static final String SCHEMA_VERSION = "3";
    private static final Pattern REQUEST_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{2,127}");
    private final RestClient client;
    private final ObjectMapper objectMapper;
    private final String serviceToken;
    private final boolean allowInsecureLocalStorageUrl;

    /**
     * Args: configured RestClient, application ObjectMapper and non-blank service token.
     * Input: trusted server configuration. Output: reusable client. Errors: IllegalArgumentException.
     */
    public HttpAiServiceClient(RestClient client, ObjectMapper objectMapper, String serviceToken) {
        this(client, objectMapper, serviceToken, false);
    }

    /**
     * Args: configured RestClient, ObjectMapper, service token and local-storage HTTP opt-in.
     * Input: trusted server configuration. Output: reusable client. Errors: IllegalArgumentException.
     */
    public HttpAiServiceClient(
            RestClient client,
            ObjectMapper objectMapper,
            String serviceToken,
            boolean allowInsecureLocalStorageUrl
    ) {
        this.client = Objects.requireNonNull(client, "client");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
        this.serviceToken = requireText(serviceToken, 16, 4096, "serviceToken");
        this.allowInsecureLocalStorageUrl = allowInsecureLocalStorageUrl;
    }

    @Override
    public JobAcceptedResponse indexDocument(IndexDocumentRequest request, String requestId, String idempotencyKey) {
        validateIndexRequest(request);
        JobAcceptedResponse response = post("/internal/v1/documents/index", request, requestId,
                requireIdempotencyKey(idempotencyKey), JobAcceptedResponse.class);
        validateAccepted(response, requestId);
        return response;
    }

    @Override
    public JobAcceptedResponse deindexDocument(DeindexDocumentRequest request, String requestId, String idempotencyKey) {
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(request.documentId(), "documentId");
        if (request.documentVersion() < 1) throw new IllegalArgumentException("documentVersion must be positive");
        requireText(request.pipelineVersion(), 1, 64, "pipelineVersion");
        JobAcceptedResponse response = post("/internal/v1/documents/deindex", request, requestId,
                requireIdempotencyKey(idempotencyKey), JobAcceptedResponse.class);
        validateAccepted(response, requestId);
        return response;
    }

    @Override
    public JobResponse getJob(UUID jobId, String requestId) {
        Objects.requireNonNull(jobId, "jobId");
        String trace = requireRequestId(requestId);
        try {
            JobResponse response = client.get().uri("/internal/v1/jobs/{jobId}", jobId)
                    .headers(headers -> applyHeaders(headers, trace, null))
                    .retrieve().body(JobResponse.class);
            validateJob(response, trace, jobId);
            return response;
        } catch (RestClientResponseException error) {
            throw mapResponseError(error, trace);
        } catch (ResourceAccessException error) {
            throw unavailable(trace, error);
        } catch (RestClientException error) {
            throw protocol(trace, "AI service returned an unreadable response");
        }
    }

    @Override
    public PersonalAssistantRunResponse runPersonalAssistant(
            PersonalAssistantRunRequest request,
            String requestId
    ) {
        validateAssistantRequest(request);
        PersonalAssistantRunResponse response = post("/internal/v1/personal-assistant/runs", request,
                requestId, null, PersonalAssistantRunResponse.class);
        validateAssistantResponse(response, requestId);
        return response;
    }

    @Override
    public CourseMaterialAskResponse askCourseMaterial(CourseMaterialAskRequest request, String requestId) {
        validateCourseAskRequest(request);
        CourseMaterialAskResponse response = post("/internal/v1/course-materials/ask", request,
                requestId, null, CourseMaterialAskResponse.class);
        validateCourseAskResponse(response, requestId);
        return response;
    }

    @Override
    public QuizGenerationResponse generateQuiz(
            QuizGenerationRequest request,
            String requestId,
            String idempotencyKey
    ) {
        validateQuizRequest(request);
        QuizGenerationResponse response = post("/internal/v1/quizzes/generate", request, requestId,
                requireIdempotencyKey(idempotencyKey), QuizGenerationResponse.class);
        validateQuizResponse(response, requestId);
        return response;
    }

    @Override
    public HealthResponse health(String requestId) {
        String trace = requireRequestId(requestId);
        try {
            HealthResponse response = client.get().uri("/internal/v1/health")
                    .headers(headers -> applyHeaders(headers, trace, null))
                    .retrieve().body(HealthResponse.class);
            if (response == null || !"UP".equals(response.status()) || !SCHEMA_VERSION.equals(response.schemaVersion())
                    || !trace.equals(response.requestId())) {
                throw protocol(trace, "AI health response does not match schema version 3");
            }
            return response;
        } catch (RestClientResponseException error) {
            throw mapResponseError(error, trace);
        } catch (ResourceAccessException error) {
            throw unavailable(trace, error);
        } catch (RestClientException error) {
            throw protocol(trace, "AI service returned an unreadable response");
        }
    }

    private <T> T post(
            String path,
            Object body,
            String requestId,
            String idempotencyKey,
            Class<T> responseType
    ) {
        String trace = requireRequestId(requestId);
        try {
            T response = client.post().uri(path)
                    .headers(headers -> applyHeaders(headers, trace, idempotencyKey))
                    .body(body)
                    .retrieve().body(responseType);
            if (response == null) throw protocol(trace, "AI service returned an empty response");
            return response;
        } catch (RestClientResponseException error) {
            throw mapResponseError(error, trace);
        } catch (ResourceAccessException error) {
            throw unavailable(trace, error);
        } catch (RestClientException error) {
            throw protocol(trace, "AI service returned an unreadable response");
        }
    }

    private void applyHeaders(HttpHeaders headers, String requestId, String idempotencyKey) {
        headers.setBearerAuth(serviceToken);
        headers.set("X-Request-Id", requestId);
        headers.set("X-Schema-Version", SCHEMA_VERSION);
        if (idempotencyKey != null) headers.set("Idempotency-Key", idempotencyKey);
    }

    private AiServiceException mapResponseError(RestClientResponseException error, String fallbackRequestId) {
        String code = "AI_SERVICE_ERROR";
        String message = "Python AI service rejected the request";
        String trace = fallbackRequestId;
        try {
            ErrorEnvelope envelope = objectMapper.readValue(error.getResponseBodyAsByteArray(), ErrorEnvelope.class);
            if (envelope != null && envelope.error() != null) {
                code = requireText(envelope.error().code(), 1, 64, "error.code");
                message = requireText(envelope.error().message(), 1, 256, "error.message");
                if (envelope.error().requestId() != null) trace = envelope.error().requestId();
            }
        } catch (IOException | IllegalArgumentException ignored) {
            // Never expose an untrusted provider/body parse failure to public callers.
        }
        return new AiServiceException(error.getStatusCode().value(), code, message, trace, error);
    }

    private static AiServiceException unavailable(String requestId, RuntimeException cause) {
        return new AiServiceException(503, "AI_SERVICE_UNAVAILABLE",
                "Python AI service is unavailable", requestId, cause);
    }

    private static AiServiceException protocol(String requestId, String message) {
        return new AiServiceException(502, "AI_INVALID_RESPONSE", message, requestId, null);
    }

    private void validateIndexRequest(IndexDocumentRequest request) {
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(request.documentId(), "documentId");
        Objects.requireNonNull(request.sourceType(), "sourceType");
        if (request.documentVersion() < 1) throw new IllegalArgumentException("documentVersion must be positive");
        requireText(request.pipelineVersion(), 1, 64, "pipelineVersion");
        URI url = Objects.requireNonNull(request.signedUrl(), "signedUrl");
        AiDocumentUrlPolicy.requireAllowed(url, allowInsecureLocalStorageUrl);
        if (!"application/pdf".equals(request.mimeType())) throw new IllegalArgumentException("mimeType must be application/pdf");
        if (request.sourceType() == AiContracts.SourceType.PERSONAL_PDF && request.ownerId() == null) {
            throw new IllegalArgumentException("Personal PDF requires ownerId");
        }
    }

    private static void validateAssistantRequest(PersonalAssistantRunRequest request) {
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(request.userId(), "userId");
        validateDocuments(request.documents(), 1, 20);
        if (request.documents().stream().anyMatch(document -> document.sourceType() != AiContracts.SourceType.PERSONAL_PDF
                || !request.userId().equals(document.ownerId()))) {
            throw new IllegalArgumentException("Personal Assistant accepts actor-owned Personal PDFs only");
        }
        List<AiContracts.ConversationTurn> history = request.history() == null ? List.of() : request.history();
        if (history.size() > 12) throw new IllegalArgumentException("history accepts at most 12 turns");
        for (AiContracts.ConversationTurn turn : history) {
            if (turn == null || turn.role() == null) throw new IllegalArgumentException("history turn is invalid");
            requireText(turn.content(), 1, 4000, "history.content");
        }
        requireText(request.message(), 1, 4000, "message");
    }

    private static void validateCourseAskRequest(CourseMaterialAskRequest request) {
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(request.userId(), "userId");
        Objects.requireNonNull(request.courseOfferingId(), "courseOfferingId");
        AuthorizedDocument document = Objects.requireNonNull(request.document(), "document");
        if (document.sourceType() != AiContracts.SourceType.COURSE_MATERIAL_PDF) {
            throw new IllegalArgumentException("Tutor requires Course Material PDF");
        }
        if (request.currentPageNumber() < 1) throw new IllegalArgumentException("currentPageNumber must be positive");
        if (document.allowedPages() != null && !document.allowedPages().contains(request.currentPageNumber())) {
            throw new IllegalArgumentException("current page is outside allowedPages");
        }
        requireText(request.question(), 1, 4000, "question");
    }

    private static void validateQuizRequest(QuizGenerationRequest request) {
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(request.actorId(), "actorId");
        Objects.requireNonNull(request.mode(), "mode");
        validateDocuments(request.documents(), 1, 20);
        requireText(request.instruction(), 1, 4000, "instruction");
        AiContracts.QuizGenerationArgs args = Objects.requireNonNull(request.generationArgs(), "generationArgs");
        if (args.questionCount() < 1 || args.questionCount() > 30 || args.difficulty() == null) {
            throw new IllegalArgumentException("generationArgs are invalid");
        }
        if (args.topic() != null) requireText(args.topic(), 1, 300, "topic");
        boolean invalid = request.mode() == AiContracts.QuizGenerationMode.PERSONAL_STUDENT
                ? request.documents().stream().anyMatch(document -> document.sourceType() != AiContracts.SourceType.PERSONAL_PDF
                        || !request.actorId().equals(document.ownerId()))
                : request.documents().stream().anyMatch(document -> document.sourceType() != AiContracts.SourceType.COURSE_MATERIAL_PDF);
        if (invalid) throw new IllegalArgumentException("Quiz mode does not match authorized documents");
    }

    private static void validateDocuments(List<AuthorizedDocument> documents, int min, int max) {
        if (documents == null || documents.size() < min || documents.size() > max
                || documents.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("document scope size is invalid");
        }
        Set<UUID> ids = new HashSet<>();
        if (documents.stream().anyMatch(document -> !ids.add(document.documentId()))) {
            throw new IllegalArgumentException("document scope contains duplicate IDs");
        }
    }

    private static void validateAccepted(JobAcceptedResponse response, String requestId) {
        if (response == null || !requestId.equals(response.requestId()) || response.jobId() == null
                || response.status() == null || response.status() == JobStatus.SUCCEEDED
                || response.status() == JobStatus.FAILED) {
            throw protocol(requestId, "AI job acceptance response is invalid");
        }
    }

    private static void validateJob(JobResponse response, String requestId, UUID jobId) {
        if (response == null || !requestId.equals(response.requestId()) || !jobId.equals(response.jobId())
                || response.status() == null || response.attempt() < 0) {
            throw protocol(requestId, "AI job response is invalid");
        }
        if (response.status() == JobStatus.SUCCEEDED) {
            AiContracts.IndexArtifact artifact = response.artifact();
            if (artifact == null || artifact.pageCount() < 1 || artifact.chunkCount() < 1
                    || artifact.embeddingDimensions() < 1) {
                throw protocol(requestId, "Successful AI index job has invalid artifact metadata");
            }
        }
        if (response.status() == JobStatus.FAILED && isBlank(response.errorCode())) {
            throw protocol(requestId, "Failed AI index job requires a safe error code");
        }
    }

    private static void validateAssistantResponse(PersonalAssistantRunResponse response, String requestId) {
        if (response == null || !requestId.equals(response.requestId()) || response.result() == null) {
            throw protocol(requestId, "Personal Assistant response is invalid");
        }
        AssistantRunResult result = response.result();
        if (result.selectedTool() == null || result.status() == null) throw protocol(requestId, "Assistant outcome is incomplete");
        if (result.status() == AssistantRunStatus.ANSWERED || result.status() == AssistantRunStatus.SUMMARIZED) {
            requireAnswerAndCitations(result.answer(), result.citations(), requestId);
        } else if (result.status() == AssistantRunStatus.QUIZ_CREATED) {
            validateQuizDraft(result.quiz(), requestId);
        } else if (result.status() == AssistantRunStatus.NEEDS_CLARIFICATION) {
            if (isBlank(result.clarificationQuestion())) throw protocol(requestId, "Clarification outcome requires a question");
        } else if (result.answer() != null || (result.citations() != null && !result.citations().isEmpty()) || result.quiz() != null) {
            throw protocol(requestId, "NO_EVIDENCE must not contain generated content");
        }
    }

    private static void validateCourseAskResponse(CourseMaterialAskResponse response, String requestId) {
        if (response == null || !requestId.equals(response.requestId()) || response.result() == null
                || response.result().status() == null) {
            throw protocol(requestId, "Tutor response is invalid");
        }
        if (response.result().status() == AnswerStatus.ANSWERED) {
            requireAnswerAndCitations(response.result().answer(), response.result().citations(), requestId);
        } else if (response.result().answer() != null
                || (response.result().citations() != null && !response.result().citations().isEmpty())) {
            throw protocol(requestId, "NO_EVIDENCE must not contain generated content");
        }
    }

    private static void validateQuizResponse(QuizGenerationResponse response, String requestId) {
        if (response == null || !requestId.equals(response.requestId()) || response.status() == null) {
            throw protocol(requestId, "Quiz generation response is invalid");
        }
        if (response.status() == QuizGenerationStatus.DRAFT_CREATED) validateQuizDraft(response.quiz(), requestId);
        else if (response.quiz() != null) throw protocol(requestId, "NO_EVIDENCE must not contain a Quiz");
    }

    private static void validateQuizDraft(QuizDraft quiz, String requestId) {
        if (quiz == null || !"MCQ_SINGLE".equals(quiz.quizType()) || isBlank(quiz.title())
                || quiz.questions() == null || quiz.questions().isEmpty() || quiz.questions().size() > 30) {
            throw protocol(requestId, "AI Quiz draft is invalid");
        }
        for (QuizQuestionDraft question : quiz.questions()) {
            if (question == null || isBlank(question.question()) || isBlank(question.explanation())
                    || question.options() == null || question.options().size() != 4
                    || question.correctOptionIndex() < 0 || question.correctOptionIndex() > 3
                    || question.options().stream().anyMatch(HttpAiServiceClient::isBlank)
                    || question.options().stream().map(String::strip).map(String::toLowerCase).distinct().count() != 4) {
                throw protocol(requestId, "AI Quiz question must contain four distinct options and one valid answer");
            }
            validateCitations(question.citations(), requestId);
        }
    }

    private static void requireAnswerAndCitations(String answer, List<Citation> citations, String requestId) {
        if (isBlank(answer)) throw protocol(requestId, "Grounded answer text is missing");
        validateCitations(citations, requestId);
    }

    private static void validateCitations(List<Citation> citations, String requestId) {
        if (citations == null || citations.isEmpty()) throw protocol(requestId, "Grounded output requires citations");
        for (Citation citation : citations) {
            if (citation == null || citation.documentId() == null || citation.documentVersion() < 1
                    || citation.pageNumber() < 1 || isBlank(citation.excerpt()) || citation.excerpt().length() > 1200) {
                throw protocol(requestId, "AI citation is invalid");
            }
        }
    }

    private static String requireRequestId(String value) {
        if (value == null || !REQUEST_ID.matcher(value).matches()) throw new IllegalArgumentException("requestId is invalid");
        return value;
    }

    private static String requireIdempotencyKey(String value) {
        return requireText(value, 8, 255, "idempotencyKey");
    }

    private static String requireText(String value, int min, int max, String field) {
        if (value == null || value.strip().length() < min || value.length() > max) {
            throw new IllegalArgumentException(field + " is invalid");
        }
        return value;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
