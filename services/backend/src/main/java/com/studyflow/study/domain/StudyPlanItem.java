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
        Instant reminderAt,
        Instant reminderSentAt,
        StudyPlanItemStatus status,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt,
        UUID courseOfferingId
) {
    /** Args: original personal-only fields. Input: historical or synthetic item without class link. Output: item with null courseOfferingId. */
    public StudyPlanItem(UUID id, UUID planId, String title, String description, StudyPlanItemType type,
                         Instant scheduledStart, Instant scheduledEnd, Instant dueAt, Instant reminderAt,
                         Instant reminderSentAt, StudyPlanItemStatus status, Instant completedAt,
                         Instant createdAt, Instant updatedAt) {
        this(id, planId, title, description, type, scheduledStart, scheduledEnd, dueAt, reminderAt,
                reminderSentAt, status, completedAt, createdAt, updatedAt, null);
    }
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
     * @param reminderAt optional reminder time not after dueAt
     * @param now creation time
     * @param courseOfferingId optional approved class link
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
            Instant reminderAt,
            Instant now,
            UUID courseOfferingId
    ) {
        return new StudyPlanItem(
                UUID.randomUUID(), planId, title, description, type,
                scheduledStart, scheduledEnd, dueAt, reminderAt, null, StudyPlanItemStatus.TODO,
                null, now, now, courseOfferingId
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
     * @param newReminderAt optional reminder time recalculated from the deadline
     * @param now update time
     * @param newCourseOfferingId optional approved class link
     * @return updated immutable item
     */
    public StudyPlanItem updateDetails(
            String newTitle,
            String newDescription,
            StudyPlanItemType newType,
            Instant newScheduledStart,
            Instant newScheduledEnd,
            Instant newDueAt,
            Instant newReminderAt,
            Instant now,
            UUID newCourseOfferingId
    ) {
        return new StudyPlanItem(
                id, planId, newTitle, newDescription, newType,
                newScheduledStart, newScheduledEnd, newDueAt, newReminderAt, null, status,
                completedAt, createdAt, now, newCourseOfferingId
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
                reminderAt, reminderSentAt,
                newStatus, newCompletedAt, createdAt, now, courseOfferingId
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
                        dueAt, reminderAt, reminderSentAt, StudyPlanItemStatus.CANCELLED,
                        null, createdAt, now, courseOfferingId
                );
    }

    /**
     * Args: deletion time. Input: an owned item in a mutable plan. Output: DELETED item hidden from
     * ordinary lists/calendar while retaining its original completion timestamp and learning event.
     * Errors: none; repeated deletion returns the current value. Side effect: none until repository save.
     */
    public StudyPlanItem delete(Instant now) {
        return status == StudyPlanItemStatus.DELETED
                ? this
                : new StudyPlanItem(id, planId, title, description, type, scheduledStart, scheduledEnd,
                        dueAt, reminderAt, reminderSentAt, StudyPlanItemStatus.DELETED,
                        completedAt, createdAt, now, courseOfferingId);
    }
}
