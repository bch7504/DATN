package com.studyflow.notification.domain;

import java.time.Instant;
import java.util.UUID;

public record StudentNotification(
        UUID id,
        UUID userId,
        NotificationType type,
        String title,
        String message,
        String sourceType,
        UUID sourceId,
        Instant dueAt,
        Instant readAt,
        Instant createdAt
) {
    /**
     * Marks an unread notification as read without changing its source metadata.
     *
     * @param now required read time
     * @return updated notification, or this value when already read
     */
    public StudentNotification markRead(Instant now) {
        return readAt == null
                ? new StudentNotification(
                        id, userId, type, title, message, sourceType, sourceId,
                        dueAt, now, createdAt
                )
                : this;
    }
}
