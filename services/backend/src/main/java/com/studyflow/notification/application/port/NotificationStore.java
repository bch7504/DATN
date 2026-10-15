package com.studyflow.notification.application.port;

import com.studyflow.notification.domain.StudentNotification;
import com.studyflow.study.application.PageResult;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface NotificationStore {
    /**
     * Inserts one deadline notification unless its owner/type/source tuple already exists.
     *
     * @return true only when a new row is inserted; false for an idempotent retry
     */
    boolean createDeadlineReminderIfAbsent(
            UUID userId,
            UUID itemId,
            String title,
            String message,
            Instant dueAt,
            Instant createdAt
    );

    /** Inserts an idempotent reminder for a published class assignment. */
    boolean createAssignmentDeadlineReminderIfAbsent(
            UUID studentId, UUID assignmentId, String assignmentTitle, Instant dueAt, Instant createdAt);

    /** Inserts an idempotent notice when the Teacher publishes an assignment to a class. */
    boolean createAssignmentPublishedIfAbsent(
            UUID studentId, UUID assignmentId, String assignmentTitle, Instant dueAt, Instant createdAt);

    /**
     * Returns an owner-scoped page, optionally restricted to unread rows.
     *
     * @return page ordered newest first
     */
    PageResult<StudentNotification> findOwned(
            UUID userId,
            boolean unreadOnly,
            int page,
            int size
    );

    /** Returns one notification only when it belongs to the supplied user. */
    Optional<StudentNotification> findOwned(UUID notificationId, UUID userId);

    /** Persists a complete typed notification and returns the stored projection. */
    StudentNotification save(StudentNotification notification);
}
