package com.studyflow.study.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "learning_events")
class LearningEventJpaEntity {

    @Id
    private UUID id;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "event_type", nullable = false, length = 40)
    private String eventType;

    @Column(name = "source_type", nullable = false, length = 40)
    private String sourceType;

    @Column(name = "source_id", nullable = false)
    private UUID sourceId;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(name = "quantity", nullable = false)
    private int quantity = 1;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LearningEventJpaEntity() {
    }

    static LearningEventJpaEntity studyTaskCompleted(
            UUID studentId,
            UUID itemId,
            String idempotencyKey,
            Instant occurredAt,
            LocalDate activityDate
    ) {
        LearningEventJpaEntity entity = new LearningEventJpaEntity();
        entity.id = UUID.randomUUID();
        entity.studentId = studentId;
        entity.eventType = "STUDY_TASK_COMPLETED";
        entity.sourceType = "STUDY_PLAN_ITEM";
        entity.sourceId = itemId;
        entity.idempotencyKey = idempotencyKey;
        entity.quantity = 1;
        entity.occurredAt = occurredAt;
        entity.activityDate = activityDate;
        entity.quantity = 1;
        entity.createdAt = occurredAt;
        return entity;
    }
}
