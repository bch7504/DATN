package com.studyflow.conversation.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Persistence boundary for owner-scoped Personal Assistant history. */
public interface PersonalConversationStore {
    /** Args: conversation metadata and document snapshot. Output: saved conversation. Errors: persistence failure. */
    PersonalConversationData create(PersonalConversationData conversation);

    /** Args: owner ID. Output: newest-first active conversations. Errors: persistence failure. */
    List<PersonalConversationData> findByOwner(UUID ownerId);

    /** Args: owner/conversation IDs. Output: active conversation if owned. Errors: persistence failure. */
    Optional<PersonalConversationData> findOwned(UUID ownerId, UUID conversationId);

    /** Args: conversation, user/assistant messages and update time. Output: assistant message. Errors: persistence failure. */
    PersonalConversationData.Message appendExchange(
            UUID conversationId,
            PersonalConversationData.Message userMessage,
            PersonalConversationData.Message assistantMessage,
            Instant updatedAt
    );

    /** Args: owner/conversation/time. Output: true when deleted. Side effect: soft delete. Errors: persistence failure. */
    boolean softDelete(UUID ownerId, UUID conversationId, Instant deletedAt);
}
