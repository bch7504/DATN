package com.studyflow.study.infrastructure.persistence;

import java.time.Instant;
import java.util.UUID;

interface StudyReminderProjection {
    UUID getItemId();

    UUID getStudentId();

    String getItemTitle();

    Instant getDueAt();
}
