package com.studyflow.notification.application.port;

import com.studyflow.notification.domain.NotificationType;
import java.time.Instant;
import java.util.UUID;

/** Typed projection of one queued notification and its current Student account. */
public record PendingNotificationEmail(
        UUID notificationId,
        String email,
        String timeZone,
        String role,
        String accountStatus,
        NotificationType type,
        String title,
        String message,
        Instant dueAt,
        int attemptCount
) {
}
