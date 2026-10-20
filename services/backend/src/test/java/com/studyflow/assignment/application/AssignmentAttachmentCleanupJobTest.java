package com.studyflow.assignment.application;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class AssignmentAttachmentCleanupJobTest {
    private static final Instant NOW = Instant.parse("2026-10-15T00:00:00Z");
    @Mock private AttachmentCleanupQueue queue;
    @Mock private ObjectProvider<AssignmentAttachmentStorage> storageProvider;
    @Mock private AssignmentAttachmentStorage storage;
    private AssignmentAttachmentCleanupJob job;

    /** Args: none. Input: synthetic clock/adapters. Output: initialized worker; errors: test setup failure. */
    @BeforeEach
    void setUp() {
        job = new AssignmentAttachmentCleanupJob(queue, storageProvider, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    /** Args: none. Input: due old object. Output: deleted object and queue row; errors: failed assertions. */
    @Test
    void deletesOldObjectAndAcknowledgesQueueItem() {
        PendingAttachmentCleanup item = new PendingAttachmentCleanup(UUID.randomUUID(), "assignment-submissions/old", 0);
        when(storageProvider.getIfAvailable()).thenReturn(storage);
        when(queue.lockDue(NOW, 50)).thenReturn(List.of(item));

        job.deletePending();

        verify(storage).delete(item.storageKey());
        verify(queue).markDeleted(item.id());
    }

    /** Args: none. Input: storage failure. Output: retry after two minutes; errors: failed assertions. */
    @Test
    void retriesWhenPrivateStorageIsTemporarilyUnavailable() {
        PendingAttachmentCleanup item = new PendingAttachmentCleanup(UUID.randomUUID(), "assignment-submissions/old", 0);
        when(storageProvider.getIfAvailable()).thenReturn(storage);
        when(queue.lockDue(NOW, 50)).thenReturn(List.of(item));
        doThrow(new IllegalStateException("Synthetic failure")).when(storage).delete(item.storageKey());

        job.deletePending();

        verify(queue).scheduleRetry(eq(item.id()), eq(1), eq(NOW.plusSeconds(120)));
    }

    /** Args: none. Input: missing optional storage adapter. Output: no database or storage access; errors: failed assertions. */
    @Test
    void leavesQueueUntouchedWhenStorageIsNotConfigured() {
        job.deletePending();
        verifyNoInteractions(queue, storage);
    }
}
