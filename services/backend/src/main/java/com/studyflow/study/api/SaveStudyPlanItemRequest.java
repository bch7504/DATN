package com.studyflow.study.api;

import com.studyflow.study.domain.StudyPlanItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.util.UUID;

/** Request for a personal item, optionally linked to one approved Course Offering. */
public record SaveStudyPlanItemRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 1000) String description,
        @NotNull StudyPlanItemType type,
        Instant scheduledStart,
        Instant scheduledEnd,
        Instant dueAt,
        @Min(0) @Max(10080) Integer reminderMinutesBefore,
        UUID courseOfferingId
) {
}
