package com.studyflow.assignment.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class AssignmentRequests {
    private AssignmentRequests() {}

    public record CreateDraft(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 10000) String description,
            @NotNull Instant dueAt
    ) {}

    public record UpdateDraft(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 10000) String description,
            @NotNull Instant dueAt
    ) {}

    public record SubmitAnswer(@NotBlank @Size(max = 20000) String answerText) {}

}
