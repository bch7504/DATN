package com.studyflow.assignment.application;

import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AssignmentAttachmentCleanupJob {
    private static final int BATCH_SIZE = 50;
    private final AttachmentCleanupQueue queue;
    private final ObjectProvider<AssignmentAttachmentStorage> storageProvider;
    private final Clock clock;

    /**
     * Args: durable queue, optional object storage and system clock.
     * Input: Spring-managed adapters. Output: scheduled cleanup worker; errors: configuration failures prevent startup.
     */
    public AssignmentAttachmentCleanupJob(AttachmentCleanupQueue queue,
                                          ObjectProvider<AssignmentAttachmentStorage> storageProvider, Clock clock) {
        this.queue = queue;
        this.storageProvider = storageProvider;
        this.clock = clock;
    }

    /**
     * Args: none. Input: at most 50 committed cleanup requests and configured private storage.
     * Output: void; deletes detached objects and removes their queue rows.
     * Errors: storage failures retry with capped backoff; database failures roll back the batch.
     * Side effects: permanent object deletion only after the replacement submission commits.
     */
    @Scheduled(fixedDelayString = "${studyflow.assignments.attachment-cleanup-delay:60000}")
    @Transactional
    public void deletePending() {
        AssignmentAttachmentStorage storage = storageProvider.getIfAvailable();
        if (storage == null) return;
        Instant now = clock.instant();
        for (PendingAttachmentCleanup item : queue.lockDue(now, BATCH_SIZE)) {
            try {
                storage.delete(item.storageKey());
                queue.markDeleted(item.id());
            } catch (RuntimeException storageFailure) {
                int attempts = item.attemptCount() + 1;
                long delayMinutes = Math.min(60, 1L << Math.min(attempts, 6));
                queue.scheduleRetry(item.id(), attempts, now.plus(Duration.ofMinutes(delayMinutes)));
            }
        }
    }
}
