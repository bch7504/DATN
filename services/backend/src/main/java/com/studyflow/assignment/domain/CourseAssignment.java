package com.studyflow.assignment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "course_assignments", schema = "app")
public class CourseAssignment {
    @Id
    private UUID id;
    @Column(name = "course_offering_id", nullable = false)
    private UUID courseOfferingId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
    @Column(name = "due_at", nullable = false)
    private Instant dueAt;
    @Column(name = "reminder_at", nullable = false)
    private Instant reminderAt;
    @Column(name = "reminder_sent_at")
    private Instant reminderSentAt;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssignmentStatus status;
    @Column(name = "published_at")
    private Instant publishedAt;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CourseAssignment() {}

    public CourseAssignment(UUID id, UUID courseOfferingId, UUID teacherId, String title,
                            String description, Instant dueAt, Instant reminderAt, Instant now) {
        this.id = id;
        this.courseOfferingId = courseOfferingId;
        this.teacherId = teacherId;
        this.title = title;
        this.description = description;
        this.dueAt = dueAt;
        this.reminderAt = reminderAt;
        this.status = AssignmentStatus.DRAFT;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String title, String description, Instant dueAt, Instant reminderAt, Instant now) {
        if (status != AssignmentStatus.DRAFT) throw new IllegalStateException("Only drafts can be changed.");
        this.title = title;
        this.description = description;
        this.dueAt = dueAt;
        this.reminderAt = reminderAt;
        this.updatedAt = now;
    }

    public void publish(Instant now) {
        if (status != AssignmentStatus.DRAFT) throw new IllegalStateException("Only drafts can be published.");
        status = AssignmentStatus.PUBLISHED;
        publishedAt = now;
        updatedAt = now;
    }

    public void markReminderSent(Instant now) { reminderSentAt = now; }

    public UUID getId() { return id; }
    public UUID getCourseOfferingId() { return courseOfferingId; }
    public UUID getTeacherId() { return teacherId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Instant getDueAt() { return dueAt; }
    public Instant getReminderAt() { return reminderAt; }
    public Instant getReminderSentAt() { return reminderSentAt; }
    public AssignmentStatus getStatus() { return status; }
    public Instant getPublishedAt() { return publishedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
