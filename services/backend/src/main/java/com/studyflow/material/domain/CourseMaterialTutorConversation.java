package com.studyflow.material.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Java-owned long-term memory for one Student and immutable Course Material version. */
public record CourseMaterialTutorConversation(
        UUID id,
        UUID studentId,
        UUID documentId,
        int documentVersion,
        UUID courseOfferingId,
        List<Message> messages,
        Instant createdAt,
        Instant updatedAt
) {
    /** One persisted USER/ASSISTANT turn tied to the Viewer page where it occurred. */
    public record Message(
            UUID id,
            String role,
            int pageNumber,
            String content,
            String status,
            List<Citation> citations,
            Instant createdAt
    ) { }

    /** Trusted citation persisted only after Java revalidates Python output. */
    public record Citation(
            UUID documentId,
            int documentVersion,
            int pageNumber,
            String excerpt
    ) { }
}
