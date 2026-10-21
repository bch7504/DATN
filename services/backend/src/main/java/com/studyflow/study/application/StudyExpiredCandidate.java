package com.studyflow.study.application;

import java.time.Instant;
import java.util.UUID;

/**
 * Args: item/Student IDs, item title, required deadline and optional completion time.
 * Input: an active, non-hidden study item whose deadline has passed.
 * Output: immutable data for one idempotent deadline-status notification. Errors: none.
 */
public record StudyExpiredCandidate(
        UUID itemId,
        UUID studentId,
        String itemTitle,
        Instant dueAt,
        Instant completedAt
) {
}
