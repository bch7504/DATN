package com.studyflow.study.application;

import java.time.Instant;
import java.util.UUID;

public record StudyReminderCandidate(
        UUID itemId,
        UUID studentId,
        String itemTitle,
        Instant dueAt
) {
}
