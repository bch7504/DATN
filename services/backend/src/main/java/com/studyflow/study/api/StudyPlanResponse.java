package com.studyflow.study.api;

import com.studyflow.study.domain.StudyPlan;
import com.studyflow.study.domain.StudyPlanStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StudyPlanResponse(
        UUID id,
        String title,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        StudyPlanStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    /**
     * Maps the owner-safe domain projection to its public JSON contract.
     *
     * @param plan required domain plan
     * @return response without owner/security internals
     */
    public static StudyPlanResponse from(StudyPlan plan) {
        return new StudyPlanResponse(
                plan.id(), plan.title(), plan.description(), plan.startDate(), plan.endDate(),
                plan.status(), plan.createdAt(), plan.updatedAt()
        );
    }
}
