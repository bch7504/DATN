package com.studyflow.conversation.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Typed public models for the Personal Document Assistant nested in the Personal PDF page. */
public final class PersonalAssistantApiModels {
    private PersonalAssistantApiModels() { }

    public record CreateConversationRequest(
            @NotEmpty @Size(max = 10) List<UUID> selectedDocumentIds,
            @Size(max = 200) String title
    ) { }

    public record SendMessageRequest(@NotBlank @Size(max = 2000) String message) { }

    public record Citation(UUID documentId, String documentName, int pageNumber, String excerpt, String sha256) { }

    public record QuizDraftSummary(
            UUID quizId,
            int questionCount,
            String difficulty,
            Integer pageFrom,
            Integer pageTo,
            String status
    ) { }

    public record Message(
            UUID id,
            String role,
            String content,
            String status,
            String capability,
            List<Citation> citations,
            QuizDraftSummary quizDraft,
            List<String> missingFields,
            Instant createdAt
    ) { }

    public record Conversation(
            UUID id,
            String title,
            List<UUID> selectedDocumentIds,
            List<Message> messages,
            Instant createdAt,
            Instant updatedAt
    ) { }

    public record ConversationList(
            List<Conversation> items,
            int page,
            int size,
            long totalItems,
            int totalPages
    ) { }
}
