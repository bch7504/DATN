package com.studyflow.document.api;

import java.util.List;
import java.util.UUID;

/** Safe Teacher-facing list of supporting PDFs for one slide and Course Offering. */
public record TutorSourcesResponse(
        UUID primaryDocumentId,
        UUID courseOfferingId,
        List<Source> sources
) {
    /** Supporting PDF metadata without object keys or content. */
    public record Source(UUID documentId, String title, int documentVersion, int pageCount) { }
}
