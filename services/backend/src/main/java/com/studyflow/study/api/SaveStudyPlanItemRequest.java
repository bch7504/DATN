package com.studyflow.study.api;

import com.studyflow.study.domain.StudyPlanItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record SaveStudyPlanItemRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 1000) String description,
        @NotNull StudyPlanItemType type,
        Instant scheduledStart,
        Instant scheduledEnd,
        Instant dueAt
) {
}
