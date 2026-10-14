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
}
