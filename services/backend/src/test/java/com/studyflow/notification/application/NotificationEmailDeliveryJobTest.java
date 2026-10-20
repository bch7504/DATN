package com.studyflow.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.auth.infrastructure.AuthProperties;
import com.studyflow.notification.application.port.NotificationEmailOutbox;
import com.studyflow.notification.application.port.NotificationEmailSender;
import com.studyflow.notification.application.port.PendingNotificationEmail;
import com.studyflow.notification.domain.NotificationType;
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
import org.springframework.mail.MailSendException;

@ExtendWith(MockitoExtension.class)
class NotificationEmailDeliveryJobTest {
    private static final Instant NOW = Instant.parse("2026-10-15T09:00:00Z");
    private static final UUID NOTICE_ID = UUID.fromString("fac35858-3f4a-469e-977b-37dbdd7cf00d");

    @Mock private NotificationEmailOutbox outbox;
    @Mock private NotificationEmailSender sender;
    @Mock private AuthProperties authProperties;
    private NotificationEmailDeliveryJob job;

    @BeforeEach
    void setUp() {
        job = new NotificationEmailDeliveryJob(outbox, sender, authProperties, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void validStudentReceivesDeadlineMailAndIsMarkedSent() {
        PendingNotificationEmail item = pending("student@stu.ptit.edu.vn", "STUDENT", "ACTIVE", 0);
        when(outbox.lockDue(NOW, 50)).thenReturn(List.of(item));
        when(authProperties.allowedEmailDomain()).thenReturn("stu.ptit.edu.vn");

        job.deliverPending();

        verify(sender).send("student@stu.ptit.edu.vn", "Bài tập sắp đến hạn",
                "Xin chào,\n\nBạn có bài tập sắp đến hạn.\nHạn: 16:00, 15/10/2026\n\nMở StudyFlow để xem chi tiết.\n");
        verify(outbox).markSent(NOTICE_ID, NOW);
    }

    @Test
    void sampleAccountIsSkippedWithoutSending() {
        when(outbox.lockDue(NOW, 50)).thenReturn(List.of(
                pending("sample@example.invalid", "STUDENT", "ACTIVE", 0)));
        when(authProperties.allowedEmailDomain()).thenReturn("stu.ptit.edu.vn");

        job.deliverPending();

        verify(sender, never()).send(any(), any(), any());
        verify(outbox).markSkipped(NOTICE_ID);
    }

    @Test
    void lockedAccountIsSkippedWithoutSending() {
        when(outbox.lockDue(NOW, 50)).thenReturn(List.of(
                pending("student@stu.ptit.edu.vn", "STUDENT", "LOCKED", 0)));

        job.deliverPending();

        verify(sender, never()).send(any(), any(), any());
        verify(outbox).markSkipped(NOTICE_ID);
    }

    @Test
    void smtpFailureSchedulesRetryAndDoesNotMarkSent() {
        when(outbox.lockDue(NOW, 50)).thenReturn(List.of(
                pending("student@stu.ptit.edu.vn", "STUDENT", "ACTIVE", 0)));
        when(authProperties.allowedEmailDomain()).thenReturn("stu.ptit.edu.vn");
        org.mockito.Mockito.doThrow(new MailSendException("test failure"))
                .when(sender).send(any(), any(), any());

        job.deliverPending();

        verify(outbox).markAttemptFailed(NOTICE_ID, 1, NOW.plusSeconds(120), false);
        verify(outbox, never()).markSent(any(), any());
    }

    @Test
    void fifthSmtpFailureBecomesTerminal() {
        when(outbox.lockDue(NOW, 50)).thenReturn(List.of(
                pending("student@stu.ptit.edu.vn", "STUDENT", "ACTIVE", 4)));
        when(authProperties.allowedEmailDomain()).thenReturn("stu.ptit.edu.vn");
        org.mockito.Mockito.doThrow(new MailSendException("test failure"))
                .when(sender).send(any(), any(), any());

        job.deliverPending();

        verify(outbox).markAttemptFailed(NOTICE_ID, 5, NOW.plusSeconds(32 * 60), true);
    }

    @Test
    void oldRootDomainIsSkippedWithoutSending() {
        when(outbox.lockDue(NOW, 50)).thenReturn(List.of(
                pending("student@ptit.edu.vn", "STUDENT", "ACTIVE", 0)));
        when(authProperties.allowedEmailDomain()).thenReturn("stu.ptit.edu.vn");

        job.deliverPending();

        verify(sender, never()).send(any(), any(), any());
        verify(outbox).markSkipped(NOTICE_ID);
    }

    private PendingNotificationEmail pending(String email, String role, String status, int attempts) {
        assertThat(email).isNotBlank();
        return new PendingNotificationEmail(NOTICE_ID, email, "Asia/Ho_Chi_Minh", role, status,
                NotificationType.ASSIGNMENT_DEADLINE, "Bài tập sắp đến hạn",
                "Bạn có bài tập sắp đến hạn.", NOW.plusSeconds(0), attempts);
    }
}
