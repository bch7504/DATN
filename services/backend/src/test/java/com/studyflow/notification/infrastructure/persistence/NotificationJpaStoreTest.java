package com.studyflow.notification.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.notification.application.port.NotificationEmailOutbox;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationJpaStoreTest {
    private static final UUID USER = UUID.fromString("cae44425-2516-4de5-ab92-fc43ed44982b");
    private static final UUID SOURCE = UUID.fromString("ee1ed225-5f72-4e47-b500-05c9793a5576");
    private static final Instant NOW = Instant.parse("2026-10-15T09:00:00Z");

    @Mock private SpringDataNotificationRepository repository;
    @Mock private NotificationEmailOutbox outbox;

    @Test
    void newAssignmentPublicationQueuesOneEmail() {
        when(repository.insertAssignmentPublishedIfAbsent(any(), eq(USER), eq(SOURCE), any(),
                eq(NOW.plusSeconds(3600)), eq(NOW))).thenReturn(1);

        boolean created = new NotificationJpaStore(repository, outbox)
                .createAssignmentPublishedIfAbsent(USER, SOURCE, "Bài tập", NOW.plusSeconds(3600), NOW);

        assertThat(created).isTrue();
        verify(outbox).enqueue(any(UUID.class), eq(NOW));
    }

    @Test
    void duplicateReminderDoesNotQueueAnotherEmail() {
        when(repository.insertAssignmentReminderIfAbsent(any(), eq(USER), eq(SOURCE), any(),
                eq(NOW.plusSeconds(3600)), eq(NOW))).thenReturn(0);

        boolean created = new NotificationJpaStore(repository, outbox)
                .createAssignmentDeadlineReminderIfAbsent(USER, SOURCE, "Bài tập", NOW.plusSeconds(3600), NOW);

        assertThat(created).isFalse();
        verify(outbox, never()).enqueue(any(), any());
    }
}
