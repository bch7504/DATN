package com.studyflow.material.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Persistence boundary for owner-scoped Course Material Tutor memory. */
public interface CourseMaterialTutorConversationStore {
    /** Args: exact authorized Student/document/version/offering scope. Output: existing memory if present. */
    Optional<CourseMaterialTutorConversation> findByScope(
            UUID studentId,
            UUID documentId,
            int documentVersion,
            UUID courseOfferingId
    );

    /**
     * Args: candidate immutable conversation metadata for one exact authorized scope.
     * Output: the existing or newly persisted conversation for that scope.
     * Errors: persistence failure. Side effect: creates at most one row even under concurrent first asks.
     */
    CourseMaterialTutorConversation findOrCreate(CourseMaterialTutorConversation conversation);

    /** Args: conversation and one exchange. Output: assistant message. Side effect: persists both turns. */
    CourseMaterialTutorConversation.Message appendExchange(
            UUID conversationId,
            CourseMaterialTutorConversation.Message userMessage,
            CourseMaterialTutorConversation.Message assistantMessage,
            Instant updatedAt
    );
}
