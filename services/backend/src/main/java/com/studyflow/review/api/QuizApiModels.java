package com.studyflow.review.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Typed public request/response models for Java-owned AI Quiz review. */
public final class QuizApiModels {
    private QuizApiModels() { }

    public record CreateRequest(
            @NotEmpty @Size(max = 10) List<UUID> selectedDocumentIds,
            @NotBlank @Size(max = 500) String prompt
    ) { }

    public record RegenerateRequest(@NotBlank @Size(max = 500) String prompt) { }

    public record AcceptRequest(@NotBlank String destinationType, UUID courseOfferingId) { }

    public record TeacherGenerateRequest(
            @NotEmpty @Size(max = 10) List<UUID> documentIds,
            UUID courseOfferingId,
            @NotBlank @Size(max = 1000) String instruction,
            int questionCount,
            @NotBlank String difficulty,
            @Size(max = 300) String topic,
            Integer pageFrom,
            Integer pageTo
    ) { }

    public record Option(String id, String text) { }
    public record Citation(UUID documentId, String documentName, Integer pageNumber, String excerpt) { }
    public record Question(
            UUID id,
            String questionText,
            String type,
            List<Option> options,
            String correctOptionId,
            String explanation,
            Citation citation
    ) { }

    public record Draft(
            UUID id,
            String prompt,
            List<UUID> sourceDocumentIds,
            String status,
            List<Question> questions,
            Instant createdAt
    ) { }

    public record AcceptedQuiz(
            UUID id,
            String title,
            String status,
            UUID courseOfferingId,
            String courseOfferingCode,
            boolean isPersonal,
            int questionCount,
            List<Question> questions,
            Instant createdAt,
            Instant acceptedAt
    ) { }
}
