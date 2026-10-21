package com.studyflow.notification.application.port;

import com.studyflow.notification.domain.StudentNotification;
import com.studyflow.notification.domain.NotificationType;
import com.studyflow.study.application.PageResult;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface NotificationStore {
    /**
     * Args: recipient/source UUIDs, a supported type, bounded title/message, optional dueAt,
     * creation time and email flag. Input: caller has validated owner/class access and an active transaction.
     * Output: true only for a new owner/type/source event; false for duplicate retries.
     * Errors: database failure propagates. Side effect: inserts a notice and optionally queues Student email.
     */
    boolean createEventIfAbsent(UUID recipientId, NotificationType type, String title, String message,
                                String sourceType, UUID sourceId, Instant dueAt, Instant createdAt,
                                boolean emailStudent);

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

    /** Args: teacher/enrollment IDs, class name and time. Input: pending request; output: true if newly inserted; errors: persistence failure. */
    boolean createTeacherEnrollmentRequestedIfAbsent(
            UUID teacherId, UUID enrollmentId, String className, Instant createdAt);

    /** Args: teacher/submission IDs, assignment title and time. Input: first successful submission; output: true if newly inserted; errors: persistence failure. */
    boolean createTeacherAssignmentSubmittedIfAbsent(
            UUID teacherId, UUID submissionId, String assignmentTitle, Instant createdAt);

    /**
     * Args: Student owner ID and plan-item ID.
     * Input: an owner-scoped item being permanently deleted in the current transaction.
     * Output: number of in-app notifications removed; linked email-outbox rows are explicitly removed first.
     * Errors: persistence failures propagate and roll back the caller's transaction.
     */
    int deleteStudyPlanItemNotifications(UUID studentId, UUID itemId);

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
