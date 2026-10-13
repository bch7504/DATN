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
        StudyPlanItemStatus status,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt
) {
    /**
     * Maps an owner-scoped item to the public plan/calendar JSON contract.
     *
     * @param item required domain item
     * @return public item response
     */
    public static StudyPlanItemResponse from(StudyPlanItem item) {
        return new StudyPlanItemResponse(
                item.id(), item.planId(), item.title(), item.description(), item.type(),
                item.scheduledStart(), item.scheduledEnd(), item.dueAt(), item.status(),
                item.completedAt(), item.createdAt(), item.updatedAt()
        );
    }
}
