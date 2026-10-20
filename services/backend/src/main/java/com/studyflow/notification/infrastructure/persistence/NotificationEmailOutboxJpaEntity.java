package com.studyflow.notification.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Hibernate mapping also creates the outbox in isolated create-drop integration tests. */
@Entity
@Table(schema = "app", name = "notification_email_outbox")
class NotificationEmailOutboxJpaEntity {
    @Id
    @Column(name = "notification_id")
    private UUID notificationId;

    @Column(nullable = false, length = 16)
    private String status;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    protected NotificationEmailOutboxJpaEntity() {
    }
}
