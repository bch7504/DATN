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
            List<Citation> citations
    ) { }

    public record Citation(UUID documentId, int documentVersion, int pageNumber, String excerpt) { }
}
