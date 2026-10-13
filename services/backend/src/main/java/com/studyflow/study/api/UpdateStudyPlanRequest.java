package com.studyflow.study.api;

import com.studyflow.study.domain.StudyPlanStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateStudyPlanRequest(
        @NotBlank @Size(max = 150) String title,
        @Size(max = 1000) String description,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull StudyPlanStatus status
) {
}
