package com.studyflow.notification.application;

import com.studyflow.auth.infrastructure.AuthProperties;
import com.studyflow.notification.application.port.NotificationEmailOutbox;
import com.studyflow.notification.application.port.NotificationEmailSender;
import com.studyflow.notification.application.port.PendingNotificationEmail;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class NotificationEmailDeliveryJob {
    private static final Logger LOG = LoggerFactory.getLogger(NotificationEmailDeliveryJob.class);
    private static final int BATCH_SIZE = 50;
    private static final int MAX_ATTEMPTS = 5;
    private static final DateTimeFormatter DUE_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm, dd/MM/yyyy", Locale.forLanguageTag("vi-VN"));

    private final NotificationEmailOutbox outbox;
    private final NotificationEmailSender sender;
    private final AuthProperties authProperties;
    private final Clock clock;

    /**
     * Args: required outbox, SMTP sender, institutional-domain configuration and clock.
     * Input: Spring-managed adapters. Output: scheduled delivery worker; errors: configuration failures prevent startup.
     */
    public NotificationEmailDeliveryJob(NotificationEmailOutbox outbox, NotificationEmailSender sender,
                                        AuthProperties authProperties, Clock clock) {
        this.outbox = outbox;
        this.sender = sender;
        this.authProperties = authProperties;
        this.clock = clock;
    }

    /**
     * Args: none. Input: at most 50 committed pending notifications and current Student accounts.
     * Output: void; SMTP-accepted messages become SENT, failed sends retry up to five times.
     * Errors: database failures roll back the batch; SMTP failures are recorded without aborting in-app notices.
     * Concurrent workers skip locked rows. SMTP has no idempotency key, so a crash after provider acceptance
     * but before transaction commit can result in one duplicate email on retry.
     */
    @Scheduled(fixedDelayString = "${studyflow.notifications.email-scan-delay:60000}")
    @Transactional
    public void deliverPending() {
        Instant now = clock.instant();
        for (PendingNotificationEmail item : outbox.lockDue(now, BATCH_SIZE)) {
            if (!eligible(item)) {
                outbox.markSkipped(item.notificationId());
                continue;
            }
            try {
                sender.send(item.email(), item.title(), body(item));
                outbox.markSent(item.notificationId(), clock.instant());
            } catch (MailException failure) {
                int attempts = item.attemptCount() + 1;
                long delayMinutes = Math.min(60, 1L << Math.min(attempts, 6));
                outbox.markAttemptFailed(item.notificationId(), attempts,
                        now.plus(Duration.ofMinutes(delayMinutes)), attempts >= MAX_ATTEMPTS);
                if (attempts >= MAX_ATTEMPTS) {
                    LOG.warn("Notification email delivery exhausted retries for notification {}",
                            item.notificationId());
                }
            }
        }
    }

    /** Args: queued item. Input: current account projection. Output: true for an active institutional Student; errors: none. */
    private boolean eligible(PendingNotificationEmail item) {
        String email = item.email();
        return "STUDENT".equals(item.role()) && "ACTIVE".equals(item.accountStatus())
                && email != null && email.toLowerCase(Locale.ROOT)
                .endsWith("@" + authProperties.allowedEmailDomain().toLowerCase(Locale.ROOT));
    }

    /** Args: queued item. Input: notice text and Student time zone. Output: plain-text email; invalid time zone falls back to ICT. */
    private String body(PendingNotificationEmail item) {
        StringBuilder body = new StringBuilder("Xin chào,\n\n")
                .append(item.message()).append('\n');
        if (item.dueAt() != null) {
            ZoneId zone;
            try {
                zone = ZoneId.of(item.timeZone());
            } catch (RuntimeException invalidZone) {
                zone = ZoneId.of("Asia/Ho_Chi_Minh");
            }
            body.append("Hạn: ").append(DUE_FORMAT.format(item.dueAt().atZone(zone))).append('\n');
        }
        return body.append("\nMở StudyFlow để xem chi tiết.\n").toString();
    }
}
