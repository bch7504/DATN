package com.studyflow.study.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StudyPlan(
        UUID id,
        UUID studentId,
        String title,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        StudyPlanStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    /**
     * Creates an active personal study plan owned by one Student.
     *
     * @param studentId required active Student identifier
     * @param title normalized title with 1..150 characters
     * @param description optional normalized description
     * @param startDate required inclusive start date
     * @param endDate required inclusive end date not before startDate
     * @param now creation time
     * @return new active plan with a generated identifier
     */
    public static StudyPlan create(
            UUID studentId,
            String title,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            Instant now
    ) {
        return new StudyPlan(
                UUID.randomUUID(), studentId, title, description, startDate, endDate,
                StudyPlanStatus.ACTIVE, now, now
        );
    }

    /**
     * Replaces editable plan fields while preserving ownership and creation metadata.
     *
     * @param newTitle normalized title
     * @param newDescription optional normalized description
     * @param newStartDate inclusive start date
     * @param newEndDate inclusive end date
     * @param newStatus requested lifecycle state
     * @param now update time
     * @return updated immutable plan
     */
    public StudyPlan update(
            String newTitle,
            String newDescription,
            LocalDate newStartDate,
            LocalDate newEndDate,
            StudyPlanStatus newStatus,
            Instant now
    ) {
        return new StudyPlan(
                id, studentId, newTitle, newDescription, newStartDate, newEndDate,
                newStatus, createdAt, now
        );
    }

    /**
     * Archives the plan without deleting its items or history.
     *
     * @param now archive time
     * @return archived plan, or this value when already archived
     */
    public StudyPlan archive(Instant now) {
        return status == StudyPlanStatus.ARCHIVED
                ? this
                : update(title, description, startDate, endDate, StudyPlanStatus.ARCHIVED, now);
    }
}
