package com.studyflow.study.application.port;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public interface LearningEventStore {
    void recordStudyTaskCompleted(
            UUID studentId,
            UUID itemId,
            String idempotencyKey,
            Instant occurredAt,
            LocalDate activityDate
    );

    /**
     * Args: Student owner ID and plan-item ID.
     * Input: an owner-scoped item being permanently deleted in the current transaction.
     * Output: number of matching STUDY_TASK_COMPLETED rows removed (0 or 1).
     * Errors: persistence failures propagate and roll back the caller's transaction.
     */
    int deleteStudyTaskCompletionEvents(UUID studentId, UUID itemId);
}
