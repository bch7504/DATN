package com.studyflow.study.api;

import com.studyflow.study.domain.StudyPlanItem;
import com.studyflow.study.domain.StudyPlanItemStatus;
import com.studyflow.study.domain.StudyPlanItemType;
import java.time.Instant;
import java.util.UUID;

public record StudyPlanItemResponse(
        UUID id,
        UUID planId,
        String title,
        String description,
        StudyPlanItemType type,
        Instant scheduledStart,
        Instant scheduledEnd,
        Instant dueAt,
        Instant reminderAt,
        StudyPlanItemViewStatus status,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt,
        UUID courseOfferingId
) {
    /**
     * Maps an owner-scoped item to the public plan/calendar JSON contract.
     *
     * @param item required domain item
     * @param now server clock instant for the derived OVERDUE display status
     * @return public item response
     * @throws IllegalArgumentException if an unsupported persisted status is introduced without a view mapping
     */
    public static StudyPlanItemResponse from(StudyPlanItem item, Instant now) {
        StudyPlanItemViewStatus viewStatus = item.status() == StudyPlanItemStatus.TODO
                && item.dueAt() != null && item.dueAt().isBefore(now)
                ? StudyPlanItemViewStatus.OVERDUE
                : StudyPlanItemViewStatus.valueOf(item.status().name());
        return new StudyPlanItemResponse(
                item.id(), item.planId(), item.title(), item.description(), item.type(),
                item.scheduledStart(), item.scheduledEnd(), item.dueAt(), item.reminderAt(), viewStatus,
                item.completedAt(), item.createdAt(), item.updatedAt(), item.courseOfferingId()
        );
    }
}
