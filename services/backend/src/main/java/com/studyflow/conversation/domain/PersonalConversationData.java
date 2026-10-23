package com.studyflow.conversation.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Java-owned Personal Assistant conversation with immutable PDF scope. */
public record PersonalConversationData(
        UUID id,
        UUID ownerId,
        String title,
        List<DocumentScope> documents,
        List<Message> messages,
        Instant createdAt,
        Instant updatedAt
) {
    public record DocumentScope(UUID documentId, int documentVersion) { }

    public record Message(
            UUID id,
            String role,
            String content,
            String status,
            String capability,
            UUID quizId,
            List<Citation> citations,
            Instant createdAt
    ) { }

    public record Citation(UUID documentId, int documentVersion, int pageNumber, String excerpt) { }
}
