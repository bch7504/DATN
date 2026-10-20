package com.studyflow.study.infrastructure.persistence;

import com.studyflow.study.domain.StudyPlanItem;
import com.studyflow.study.domain.StudyPlanItemStatus;
import com.studyflow.study.domain.StudyPlanItemType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "study_plan_items")
class StudyPlanItemJpaEntity {

    @Id
    private UUID id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "course_offering_id")
    private UUID courseOfferingId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 24)
    private StudyPlanItemType type;

    @Column(name = "scheduled_start")
    private Instant scheduledStart;

    @Column(name = "scheduled_end")
    private Instant scheduledEnd;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "reminder_at")
    private Instant reminderAt;

    @Column(name = "reminder_sent_at")
    private Instant reminderSentAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private StudyPlanItemStatus status;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudyPlanItemJpaEntity() {
    }

    static StudyPlanItemJpaEntity fromDomain(StudyPlanItem item) {
        StudyPlanItemJpaEntity entity = new StudyPlanItemJpaEntity();
        entity.id = item.id();
        entity.planId = item.planId();
        entity.courseOfferingId = item.courseOfferingId();
        entity.title = item.title();
        entity.description = item.description();
        entity.type = item.type();
        entity.scheduledStart = item.scheduledStart();
        entity.scheduledEnd = item.scheduledEnd();
        entity.dueAt = item.dueAt();
        entity.reminderAt = item.reminderAt();
        entity.reminderSentAt = item.reminderSentAt();
        entity.status = item.status();
        entity.completedAt = item.completedAt();
        entity.createdAt = item.createdAt();
        entity.updatedAt = item.updatedAt();
        return entity;
    }

    StudyPlanItem toDomain() {
        return new StudyPlanItem(
                id, planId, title, description, type, scheduledStart, scheduledEnd,
                dueAt, reminderAt, reminderSentAt, status, completedAt, createdAt, updatedAt,
                courseOfferingId
        );
    }
}
