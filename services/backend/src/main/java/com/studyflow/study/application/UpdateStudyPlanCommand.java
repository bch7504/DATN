package com.studyflow.study.application;

import com.studyflow.study.domain.StudyPlanStatus;
import java.time.LocalDate;

public record UpdateStudyPlanCommand(
        String title,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        StudyPlanStatus status
) {
}
