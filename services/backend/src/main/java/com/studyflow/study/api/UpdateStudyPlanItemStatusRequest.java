package com.studyflow.study.api;

import com.studyflow.study.domain.StudyPlanItemStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStudyPlanItemStatusRequest(
        @NotNull StudyPlanItemStatus status
) {
}
