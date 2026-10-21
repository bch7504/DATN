package com.studyflow.study.infrastructure.persistence;

import java.time.Instant;
import java.util.UUID;

/** Read-only projection for a past-due item without an expiry notification. */
interface StudyExpiredProjection {
    UUID getItemId();
    UUID getStudentId();
    String getItemTitle();
    Instant getDueAt();
    Instant getCompletedAt();
}
