package com.studyflow.progress.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * Entity representing an immutable learning activity event stored in app.learning_events.
 */
@Entity(name = "ProgressLearningEvent")
@Table(schema = "app", name = "learning_events")
public class LearningEvent {

    @Id
    private UUID id;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private EventType eventType;

    @Column(name = "source_type", nullable = false, length = 40)
    private String sourceType;

    @Column(name = "source_id", nullable = false)
    private UUID sourceId;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LearningEvent() {
    }

    /**
     * Args: id, studentId, eventType, sourceType, sourceId, quantity, idempotencyKey, occurredAt, activityDate, createdAt.
     * Input: validated event properties with activityDate pre-calculated according to user timezone.
     * Output: initialized LearningEvent instance.
     * Errors: NullPointerException if mandatory arguments are null; IllegalArgumentException if quantity <= 0.
     */
    public LearningEvent(
            UUID id,
            UUID studentId,
            EventType eventType,
            String sourceType,
            UUID sourceId,
            int quantity,
            String idempotencyKey,
            Instant occurredAt,
            LocalDate activityDate,
            Instant createdAt
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.studentId = Objects.requireNonNull(studentId, "studentId must not be null");
        this.eventType = Objects.requireNonNull(eventType, "eventType must not be null");
        this.sourceType = Objects.requireNonNull(sourceType, "sourceType must not be null");
        this.sourceId = Objects.requireNonNull(sourceId, "sourceId must not be null");
        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity must be strictly positive");
        }
        this.quantity = quantity;
        this.idempotencyKey = Objects.requireNonNull(idempotencyKey, "idempotencyKey must not be null");
        this.occurredAt = Objects.requireNonNull(occurredAt, "occurredAt must not be null");
        this.activityDate = Objects.requireNonNull(activityDate, "activityDate must not be null");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
    }

    /**
     * Factory to construct a new LearningEvent.
     */
    public static LearningEvent record(
            UUID studentId,
            EventType eventType,
            String sourceType,
            UUID sourceId,
            int quantity,
            String idempotencyKey,
            Instant occurredAt,
            LocalDate activityDate
    ) {
        return new LearningEvent(
                UUID.randomUUID(),
                studentId,
                eventType,
                sourceType,
                sourceId,
                quantity,
                idempotencyKey,
                occurredAt,
                activityDate,
                occurredAt
        );
    }

    public UUID getId() {
        return id;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public EventType getEventType() {
        return eventType;
    }

    public String getSourceType() {
        return sourceType;
    }

    public UUID getSourceId() {
        return sourceId;
    }

    public int getQuantity() {
        return quantity;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public LocalDate getActivityDate() {
        return activityDate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
