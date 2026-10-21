package com.studyflow.material.api;

import java.util.List;
import java.util.UUID;

/** Grounded Tutor answer returned by Java after citation scope is revalidated. */
public record CourseMaterialTutorResponse(
        String status,
        String answer,
        List<CitationResponse> citations,
        String traceId
) {
    /** User-visible source location; no storage key, vector or provider metadata is exposed. */
    public record CitationResponse(UUID documentId, String documentName, int pageNumber, String excerpt) { }
}
