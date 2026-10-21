package com.studyflow.study.application;

import com.studyflow.study.domain.StudyPlanItemType;
import java.time.Instant;
import java.util.UUID;

/**
 * Args: required title/type; optional description, paired schedule, due time, reminder offset and approved
 * courseOfferingId. Input: authenticated Student request after HTTP validation. Output: immutable command;
 * no side effects or exceptions until application validation.
 */
public record SaveStudyPlanItemCommand(
        String title,
        String description,
        StudyPlanItemType type,
        Instant scheduledStart,
        Instant scheduledEnd,
        Instant dueAt,
        Integer reminderMinutesBefore,
        UUID courseOfferingId
) {
    /** Args: legacy personal-only fields. Input: request without class link. Output: command with null courseOfferingId. */
    public SaveStudyPlanItemCommand(String title, String description, StudyPlanItemType type,
                                    Instant scheduledStart, Instant scheduledEnd, Instant dueAt,
                                    Integer reminderMinutesBefore) {
        this(title, description, type, scheduledStart, scheduledEnd, dueAt, reminderMinutesBefore, null);
    }
}
