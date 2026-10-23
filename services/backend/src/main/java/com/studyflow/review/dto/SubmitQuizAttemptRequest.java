package com.studyflow.review.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;

public record SubmitQuizAttemptRequest(
        @NotNull(message = "Answers map is required")
        Map<UUID, Integer> answers
) {}
