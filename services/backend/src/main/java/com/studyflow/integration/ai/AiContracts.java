package com.studyflow.integration.ai;

import java.net.URI;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Typed schema-version-4 values exchanged only between Java and the Python AI service.
 * Browser-facing DTOs must not reuse these records directly.
 */
public final class AiContracts {
    private AiContracts() { }

    public enum SourceType { PERSONAL_PDF, COURSE_MATERIAL_PDF }
    public enum JobStatus { PENDING, RUNNING, SUCCEEDED, FAILED }
    public enum ConversationRole { USER, ASSISTANT }
    public enum AssistantTool {
        ASK_DOCUMENT,
        SUMMARIZE_DOCUMENT,
        GENERATE_QUIZ,
        IMPORT_QUIZ_FROM_TEXT,
        NEEDS_CLARIFICATION
    }
    public enum AssistantRunStatus { ANSWERED, SUMMARIZED, QUIZ_CREATED, NEEDS_CLARIFICATION, NO_EVIDENCE }
    public enum AnswerStatus { ANSWERED, NO_EVIDENCE }
    public enum QuizGenerationMode { PERSONAL_STUDENT, COURSE_TEACHER }
    public enum QuizDifficulty { EASY, MEDIUM, HARD, MIXED }
    public enum QuizGenerationStatus { DRAFT_CREATED, NO_EVIDENCE }
    public enum QuizDraftSource { PDF_GROUNDED, IMPORTED_TEXT }

    /** One PDF/version/page scope already authorized by Java business services. */
    public record AuthorizedDocument(
            UUID documentId,
            int documentVersion,
            UUID ownerId,
            SourceType sourceType,
            List<Integer> allowedPages
    ) {
        public AuthorizedDocument {
            Objects.requireNonNull(documentId, "documentId");
            Objects.requireNonNull(sourceType, "sourceType");
            if (documentVersion < 1) throw new IllegalArgumentException("documentVersion must be positive");
            if (sourceType == SourceType.PERSONAL_PDF && ownerId == null) {
                throw new IllegalArgumentException("Personal PDF requires ownerId");
            }
            if (allowedPages != null) {
                allowedPages = List.copyOf(allowedPages);
                if (allowedPages.stream().anyMatch(page -> page == null || page < 1)
                        || allowedPages.stream().distinct().count() != allowedPages.size()) {
                    throw new IllegalArgumentException("allowedPages must contain unique positive pages");
                }
            }
        }
    }

    /** Request to enqueue one immutable PDF version for parsing and vector indexing. */
    public record IndexDocumentRequest(
            UUID documentId,
            int documentVersion,
            String pipelineVersion,
            UUID ownerId,
            SourceType sourceType,
            URI signedUrl,
            String mimeType
    ) { }

    /** Request to revoke one exact document index. */
    public record DeindexDocumentRequest(UUID documentId, int documentVersion, String pipelineVersion) { }

    /** Accepted asynchronous indexing/deindexing operation. */
    public record JobAcceptedResponse(String requestId, UUID jobId, JobStatus status) { }

    /** Safe artifact metadata produced by a successful indexing job. */
    public record IndexArtifact(
            int pageCount,
            int chunkCount,
            String embeddingModel,
            int embeddingDimensions,
            String pipelineVersion
    ) { }

    /** Poll response that intentionally excludes signed URLs, text chunks, and vectors. */
    public record JobResponse(
            String requestId,
            UUID jobId,
            JobStatus status,
            int attempt,
            String errorCode,
            IndexArtifact artifact
    ) { }

    /** Bounded conversation history supplied by Java; system messages are not accepted. */
    public record ConversationTurn(ConversationRole role, String content) { }

    /** Personal Assistant request for actor-owned Personal PDF scope. */
    public record PersonalAssistantRunRequest(
            UUID userId,
            UUID conversationId,
            List<AuthorizedDocument> documents,
            List<ConversationTurn> history,
            String message
    ) { }

    /** One citation to an immutable PDF version and 1-based page. */
    public record Citation(
            UUID documentId,
            int documentVersion,
            int pageNumber,
            String excerpt
    ) { }

    /** Normalized page rectangle; every value is relative to the immutable PDF page. */
    public record NormalizedBoundingBox(double x, double y, double width, double height) { }

    /** Trusted source reference from which Java materializes one private Quiz PNG. */
    public record QuizImageReference(
            UUID documentId,
            int documentVersion,
            int pageNumber,
            NormalizedBoundingBox bbox,
            String altText
    ) { }

    /** Trusted generation controls separated from the user's untrusted instruction. */
    public record QuizGenerationArgs(int questionCount, QuizDifficulty difficulty, String topic) { }

    /** One grounded MCQ_SINGLE draft question returned by Python. */
    public record QuizQuestionDraft(
            String question,
            List<String> options,
            int correctOptionIndex,
            String explanation,
            List<Citation> citations,
            QuizImageReference image
    ) {
        /** Backward-compatible constructor for questions that do not require a visual artifact. */
        public QuizQuestionDraft(
                String question,
                List<String> options,
                int correctOptionIndex,
                String explanation,
                List<Citation> citations
        ) {
            this(question, options, correctOptionIndex, explanation, citations, null);
        }
    }

    /** Draft provenance is explicit; lifecycle, scoring and publication remain owned by Java. */
    public record QuizDraft(
            String quizType,
            QuizDraftSource sourceType,
            String title,
            List<QuizQuestionDraft> questions
    ) {
        public QuizDraft {
            if (sourceType == null) sourceType = QuizDraftSource.PDF_GROUNDED;
        }

        /** Backward-compatible constructor for existing grounded PDF callers and fixtures. */
        public QuizDraft(String quizType, String title, List<QuizQuestionDraft> questions) {
            this(quizType, QuizDraftSource.PDF_GROUNDED, title, questions);
        }
    }

    /** Structured output of the Personal Document Single Orchestrator Agent. */
    public record AssistantRunResult(
            AssistantTool selectedTool,
            AssistantRunStatus status,
            String answer,
            List<Citation> citations,
            QuizDraft quiz,
            String clarificationQuestion
    ) { }

    public record PersonalAssistantRunResponse(String requestId, AssistantRunResult result) { }

    /** Course Material Tutor request after Java verifies enrollment and publication. */
    public record CourseMaterialAskRequest(
            UUID userId,
            UUID courseOfferingId,
            AuthorizedDocument document,
            int currentPageNumber,
            List<ConversationTurn> history,
            String question
    ) { }

    public record GroundedAnswerResult(AnswerStatus status, String answer, List<Citation> citations) { }
    public record CourseMaterialAskResponse(String requestId, GroundedAnswerResult result) { }

    /** Direct Student/Teacher Quiz generation request with Java-authorized PDF scope. */
    public record QuizGenerationRequest(
            UUID actorId,
            QuizGenerationMode mode,
            List<AuthorizedDocument> documents,
            String instruction,
            QuizGenerationArgs generationArgs
    ) { }

    public record QuizGenerationResponse(
            String requestId,
            QuizGenerationStatus status,
            QuizDraft quiz
    ) { }

    /** Non-sensitive Python liveness/configuration summary. */
    public record HealthResponse(
            String service,
            String version,
            String status,
            String readiness,
            String schemaVersion,
            String requestId,
            List<String> missingConfiguration
    ) { }

    /** Safe internal error envelope; provider payloads and secrets are never represented. */
    public record ErrorEnvelope(ErrorDetail error) { }
    public record ErrorDetail(String code, String message, String requestId) { }
}
