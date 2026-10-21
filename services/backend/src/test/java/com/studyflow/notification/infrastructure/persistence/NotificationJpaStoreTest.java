package com.studyflow.notification.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.notification.application.port.NotificationEmailOutbox;
import com.studyflow.notification.domain.NotificationType;
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

    @Test
    void teacherNoticeDoesNotQueueStudentEmail() {
        when(repository.insertTeacherEnrollmentRequestedIfAbsent(any(), eq(USER), eq(SOURCE), any(), eq(NOW)))
                .thenReturn(1);
        boolean created = new NotificationJpaStore(repository, outbox)
                .createTeacherEnrollmentRequestedIfAbsent(USER, SOURCE, "Lớp kiểm thử", NOW);
        assertThat(created).isTrue();
        verify(outbox, never()).enqueue(any(), any());
    }

    @Test
    void duplicateTeacherNoticeDoesNotQueueEmailOrOverwriteReadState() {
        when(repository.insertTeacherAssignmentSubmittedIfAbsent(any(), eq(USER), eq(SOURCE), any(), eq(NOW)))
                .thenReturn(0);
        boolean created = new NotificationJpaStore(repository, outbox)
                .createTeacherAssignmentSubmittedIfAbsent(USER, SOURCE, "Bài tập kiểm thử", NOW);
        assertThat(created).isFalse();
        verify(outbox, never()).enqueue(any(), any());
    }

    /** Args: none. Input: synthetic new Student material event. Output: one in-app row and one queued email; errors: assertion failure. */
    @Test
    void newStudentMaterialEventQueuesEmail() {
        when(repository.insertEventIfAbsent(any(), eq(USER), eq("STUDENT_MATERIAL_PUBLISHED"),
                eq("Học liệu mới"), eq("PDF mới"), eq("DOCUMENT_PUBLICATION"), eq(SOURCE),
                org.mockito.ArgumentMatchers.isNull(), eq(NOW))).thenReturn(1);

        boolean created = new NotificationJpaStore(repository, outbox).createEventIfAbsent(USER,
                NotificationType.STUDENT_MATERIAL_PUBLISHED, "Học liệu mới", "PDF mới",
                "DOCUMENT_PUBLICATION", SOURCE, null, NOW, true);

        assertThat(created).isTrue();
        verify(outbox).enqueue(any(UUID.class), eq(NOW));
    }

    /** Args: none. Input: duplicate Teacher expiry event. Output: no new row/email; errors: assertion failure. */
    @Test
    void duplicateGenericEventDoesNotQueueEmail() {
        when(repository.insertEventIfAbsent(any(), eq(USER), eq("TEACHER_ASSIGNMENT_EXPIRED"),
                any(), any(), eq("COURSE_ASSIGNMENT"), eq(SOURCE), eq(NOW), eq(NOW))).thenReturn(0);

        boolean created = new NotificationJpaStore(repository, outbox).createEventIfAbsent(USER,
                NotificationType.TEACHER_ASSIGNMENT_EXPIRED, "Hết hạn", "Bài đã hết hạn",
                "COURSE_ASSIGNMENT", SOURCE, NOW, NOW, false);

        assertThat(created).isFalse();
        verify(outbox, never()).enqueue(any(), any());
    }
}
