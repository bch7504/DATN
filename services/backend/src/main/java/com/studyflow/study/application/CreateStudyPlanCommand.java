package com.studyflow.study.application;

import java.time.LocalDate;

public record CreateStudyPlanCommand(
        String title,
        String description,
        LocalDate startDate,
        LocalDate endDate
) {
}
