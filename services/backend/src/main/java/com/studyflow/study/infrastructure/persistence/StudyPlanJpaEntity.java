package com.studyflow.study.infrastructure.persistence;

import com.studyflow.study.domain.StudyPlan;
import com.studyflow.study.domain.StudyPlanStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "study_plans")
class StudyPlanJpaEntity {

    @Id
    private UUID id;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private StudyPlanStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudyPlanJpaEntity() {
    }

    static StudyPlanJpaEntity fromDomain(StudyPlan plan) {
        StudyPlanJpaEntity entity = new StudyPlanJpaEntity();
        entity.id = plan.id();
        entity.studentId = plan.studentId();
        entity.title = plan.title();
        entity.description = plan.description();
        entity.startDate = plan.startDate();
        entity.endDate = plan.endDate();
        entity.status = plan.status();
        entity.createdAt = plan.createdAt();
        entity.updatedAt = plan.updatedAt();
        return entity;
    }

    StudyPlan toDomain() {
        return new StudyPlan(
                id, studentId, title, description, startDate, endDate, status, createdAt, updatedAt
        );
    }
}
