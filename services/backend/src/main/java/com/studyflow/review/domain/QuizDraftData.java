package com.studyflow.review.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Fully validated Java-owned AI Quiz draft. */
public record QuizDraftData(
        UUID id,
        UUID ownerId,
        String mode,
        String prompt,
        String title,
        String status,
        String destinationType,
        UUID courseOfferingId,
        List<UUID> sourceDocumentIds,
        List<Question> questions,
        Instant createdAt,
        Instant acceptedAt
) {
    public record Question(
            UUID id,
            String questionText,
            List<String> options,
            int correctOptionIndex,
            String explanation,
            List<Citation> citations,
            Image image
    ) {
        /** Backward-compatible constructor for text-only Quiz questions. */
        public Question(
                UUID id,
                String questionText,
                List<String> options,
                int correctOptionIndex,
                String explanation,
                List<Citation> citations
        ) {
            this(id, questionText, options, correctOptionIndex, explanation, citations, null);
        }
    }

    public record Citation(UUID documentId, int documentVersion, int pageNumber, String excerpt) { }

    /** Private rendered PNG metadata. Object keys never cross the public API. */
    public record Image(
            UUID id,
            UUID documentId,
            int documentVersion,
            int pageNumber,
            double bboxX,
            double bboxY,
            double bboxWidth,
            double bboxHeight,
            String objectKey,
            String altText
    ) { }
}
