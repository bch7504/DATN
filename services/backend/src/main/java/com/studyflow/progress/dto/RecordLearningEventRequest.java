package com.studyflow.progress.dto;

import com.studyflow.progress.domain.EventType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Request payload for reporting client learning events (e.g. view page).
 */
public record RecordLearningEventRequest(
        @NotNull(message = "eventType is required")
        EventType eventType,

        @NotBlank(message = "sourceType is required")
        String sourceType,

        @NotNull(message = "sourceId is required")
        UUID sourceId,

        @Min(value = 1, message = "quantity must be at least 1")
        int quantity,

        @NotBlank(message = "idempotencyKey is required")
        String idempotencyKey
) {}
