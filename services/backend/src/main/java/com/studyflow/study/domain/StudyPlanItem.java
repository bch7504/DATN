package com.studyflow.study.domain;

import java.time.Instant;
import java.util.UUID;

public record StudyPlanItem(
        UUID id,
        UUID planId,
        String title,
        String description,
        StudyPlanItemType type,
        Instant scheduledStart,
        Instant scheduledEnd,
        Instant dueAt,
        StudyPlanItemStatus status,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt
) {
    /**
     * Creates a to-do item inside a personal study plan.
     *
     * @param planId required owner plan identifier
     * @param title normalized title with 1..200 characters
     * @param description optional normalized description
     * @param type required item type
     * @param scheduledStart optional UTC schedule start, paired with scheduledEnd
     * @param scheduledEnd optional UTC schedule end, later than scheduledStart
     * @param dueAt optional UTC deadline; at least schedule or deadline is required
     * @param now creation time
     * @return new TODO item with a generated identifier
     */
    public static StudyPlanItem create(
            UUID planId,
            String title,
            String description,
            StudyPlanItemType type,
            Instant scheduledStart,
            Instant scheduledEnd,
            Instant dueAt,
            Instant now
    ) {
        return new StudyPlanItem(
                UUID.randomUUID(), planId, title, description, type,
                scheduledStart, scheduledEnd, dueAt, StudyPlanItemStatus.TODO,
                null, now, now
        );
    }

    /**
     * Replaces editable item content and schedule while preserving lifecycle state.
     *
     * @param newTitle normalized title
     * @param newDescription optional normalized description
     * @param newType required item type
     * @param newScheduledStart optional schedule start
     * @param newScheduledEnd optional schedule end
     * @param newDueAt optional deadline
     * @param now update time
     * @return updated immutable item
     */
    public StudyPlanItem updateDetails(
            String newTitle,
            String newDescription,
            StudyPlanItemType newType,
            Instant newScheduledStart,
            Instant newScheduledEnd,
            Instant newDueAt,
            Instant now
    ) {
        return new StudyPlanItem(
                id, planId, newTitle, newDescription, newType,
                newScheduledStart, newScheduledEnd, newDueAt, status,
                completedAt, createdAt, now
        );
    }

    /**
     * Changes TODO/completion state and records completion time consistently.
     *
     * @param newStatus TODO or COMPLETED
     * @param now transition time
     * @return updated immutable item
     */
    public StudyPlanItem changeStatus(StudyPlanItemStatus newStatus, Instant now) {
        Instant newCompletedAt = newStatus == StudyPlanItemStatus.COMPLETED ? now : null;
        return new StudyPlanItem(
                id, planId, title, description, type, scheduledStart, scheduledEnd, dueAt,
                newStatus, newCompletedAt, createdAt, now
        );
    }

    /**
     * Cancels the item without physically deleting learning history.
     *
     * @param now cancellation time
     * @return cancelled item, or this value when already cancelled
     */
    public StudyPlanItem cancel(Instant now) {
        return status == StudyPlanItemStatus.CANCELLED
                ? this
                : new StudyPlanItem(
                        id, planId, title, description, type, scheduledStart, scheduledEnd,
                        dueAt, StudyPlanItemStatus.CANCELLED, null, createdAt, now
                );
    }
}
