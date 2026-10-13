package com.studyflow.notification.infrastructure.persistence;

import com.studyflow.notification.domain.NotificationType;
import com.studyflow.notification.domain.StudentNotification;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "notifications")
class NotificationJpaEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 40)
    private NotificationType type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name = "source_type", nullable = false, length = 40)
    private String sourceType;

    @Column(name = "source_id", nullable = false)
    private UUID sourceId;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected NotificationJpaEntity() {
    }

    static NotificationJpaEntity fromDomain(StudentNotification notification) {
        NotificationJpaEntity entity = new NotificationJpaEntity();
        entity.id = notification.id();
        entity.userId = notification.userId();
        entity.type = notification.type();
        entity.title = notification.title();
        entity.message = notification.message();
        entity.sourceType = notification.sourceType();
        entity.sourceId = notification.sourceId();
        entity.dueAt = notification.dueAt();
        entity.readAt = notification.readAt();
        entity.createdAt = notification.createdAt();
        return entity;
    }

    StudentNotification toDomain() {
        return new StudentNotification(
                id, userId, type, title, message, sourceType, sourceId, dueAt, readAt, createdAt
        );
    }
}
