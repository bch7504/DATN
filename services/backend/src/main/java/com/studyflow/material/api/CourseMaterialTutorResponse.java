package com.studyflow.material.api;

import java.util.List;
import java.util.UUID;

/** Grounded Tutor answer returned by Java after citation scope is revalidated. */
public record CourseMaterialTutorResponse(
        UUID conversationId,
        String status,
        String answer,
        List<CitationResponse> citations,
        String traceId
) {
    /** Backward-compatible constructor for tests/adapters that do not inspect memory identity. */
    public CourseMaterialTutorResponse(
            String status,
            String answer,
            List<CitationResponse> citations,
            String traceId
    ) {
        this(null, status, answer, citations, traceId);
    }

    /** User-visible source location; no storage key, vector or provider metadata is exposed. */
    public record CitationResponse(UUID documentId, String documentName, int pageNumber, String excerpt) { }
}
