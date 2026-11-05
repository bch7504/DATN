package com.studyflow.material.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Owner-authorized long-term Tutor memory returned to the Course Material Viewer. */
public record CourseMaterialTutorHistoryResponse(
        UUID conversationId,
        UUID documentId,
        int documentVersion,
        List<MessageResponse> messages
) {
    /** One persisted page-aware Tutor turn. */
    public record MessageResponse(
            UUID id,
            String role,
            int pageNumber,
            String content,
            String status,
            List<CourseMaterialTutorResponse.CitationResponse> citations,
            Instant createdAt
    ) { }
}
