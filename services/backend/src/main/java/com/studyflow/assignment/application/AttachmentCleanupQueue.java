package com.studyflow.assignment.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Durable queue for private objects detached from the latest assignment submission. */
public interface AttachmentCleanupQueue {
    /**
     * Args: server-generated storageKey and current instant, both required.
     * Input: the same transaction that removes attachment metadata. Output: void; queues once.
     * Errors: database failures roll back the submission replacement.
     */
    void enqueue(String storageKey, Instant now);

    /**
     * Args: current instant and batch limit 1..100. Input: active write transaction.
     * Output: due rows locked against concurrent workers. Errors: database failures propagate.
     */
    List<PendingAttachmentCleanup> lockDue(Instant now, int limit);

    /**
     * Args: queue row ID. Input: locked row whose object was deleted or was already absent.
     * Output: void; removes the queue row. Errors: database failures propagate.
     */
    void markDeleted(UUID id);

    /**
     * Args: queue ID, positive attempt count and later retry instant. Input: locked row after storage failure.
     * Output: void; schedules retry. Errors: database failures propagate.
     */
    void scheduleRetry(UUID id, int attemptCount, Instant nextAttemptAt);
}
