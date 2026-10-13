package com.studyflow.study.application;

import com.studyflow.study.domain.StudyPlanItemType;
import java.time.Instant;

public record SaveStudyPlanItemCommand(
        String title,
        String description,
        StudyPlanItemType type,
        Instant scheduledStart,
        Instant scheduledEnd,
        Instant dueAt
) {
}
