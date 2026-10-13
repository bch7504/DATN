package com.studyflow.notification.api;

import com.studyflow.notification.domain.NotificationType;
import com.studyflow.notification.domain.StudentNotification;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType type,
        String title,
        String message,
        UUID sourceId,
        Instant dueAt,
        Instant readAt,
        Instant createdAt
) {
    /**
     * Maps an owner-scoped notification to its public safe response.
     *
     * @param notification required domain notification
     * @return response without internal source type or owner identifier
     */
    public static NotificationResponse from(StudentNotification notification) {
        return new NotificationResponse(
                notification.id(), notification.type(), notification.title(), notification.message(),
                notification.sourceId(), notification.dueAt(), notification.readAt(),
                notification.createdAt()
        );
    }
}
