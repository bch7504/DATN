package com.studyflow.notification.application.port;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Durable email-delivery state for notifications, independent of their in-app read state. */
public interface NotificationEmailOutbox {

    /**
     * Args: persisted notificationId and initial attempt time, both required.
     * Input: same transaction as the notification insert. Output: void; queues once.
     * Errors: persistence failures roll back the originating notification transaction.
     */
    void enqueue(UUID notificationId, Instant nextAttemptAt);

    /**
     * Args: Student owner ID and plan-item ID.
     * Input: owner-scoped item being permanently deleted in the current transaction.
     * Output: void; removes all linked email-delivery rows, including pending and terminal entries.
     * Errors: persistence failures propagate and roll back the caller's transaction.
     */
    void deleteStudyPlanItemOutboxEntries(UUID studentId, UUID itemId);

    /**
     * Args: now is required UTC cutoff; limit is 1..100.
     * Input: an active write transaction. Output: due entries locked against competing workers.
     * Errors: database failures propagate and release locks on rollback.
     */
    List<PendingNotificationEmail> lockDue(Instant now, int limit);

    /**
     * Args: required notificationId and delivery time. Input: locked pending entry.
     * Output: void; records SMTP acceptance. Errors: persistence failure rolls back.
     */
    void markSent(UUID notificationId, Instant deliveredAt);

    /**
     * Args: required notificationId. Input: locked entry for an ineligible recipient.
     * Output: void; stops delivery. Errors: persistence failure rolls back.
     */
    void markSkipped(UUID notificationId);

    /**
     * Args: required notificationId, positive attempt count, retry instant, and terminal flag.
     * Input: locked entry after SMTP failure. Output: void; schedules retry or marks failed.
     * Errors: persistence failure rolls back.
     */
    void markAttemptFailed(UUID notificationId, int attemptCount, Instant retryAt, boolean terminal);
}
