package com.studyflow.review.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Quiz aggregate root.
 */
@Entity
@Table(name = "quizzes", schema = "app")
public class Quiz {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "creator_role", length = 20, nullable = false)
    private QuizCreatorRole creatorRole;

    @Column(name = "course_offering_id")
    private UUID courseOfferingId;

    @Column(name = "title", length = 255, nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "user_prompt", columnDefinition = "TEXT")
    private String userPrompt;

    @Enumerated(EnumType.STRING)
    @Column(name = "generation_type", length = 50, nullable = false)
    private QuizGenerationType generationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private QuizStatus status;

    @Column(name = "question_count", nullable = false)
    private int questionCount;

    @Column(name = "regenerated_from_quiz_id")
    private UUID regeneratedFromQuizId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Quiz() {}

    public Quiz(
            UUID id,
            UUID createdBy,
            QuizCreatorRole creatorRole,
            UUID courseOfferingId,
            String title,
            String description,
            String userPrompt,
            QuizGenerationType generationType,
            QuizStatus status,
            int questionCount,
            UUID regeneratedFromQuizId,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.createdBy = Objects.requireNonNull(createdBy, "createdBy must not be null");
        this.creatorRole = Objects.requireNonNull(creatorRole, "creatorRole must not be null");
        this.courseOfferingId = courseOfferingId;
        this.title = Objects.requireNonNull(title, "title must not be null");
        this.description = description;
        this.userPrompt = userPrompt;
        this.generationType = Objects.requireNonNull(generationType, "generationType must not be null");
        this.status = Objects.requireNonNull(status, "status must not be null");
        this.questionCount = questionCount;
        this.regeneratedFromQuizId = regeneratedFromQuizId;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    }

    public void accept(UUID targetCourseOfferingId, Instant now) {
        if (this.status != QuizStatus.REVIEW_REQUIRED) {
            throw new IllegalStateException("Only quizzes in REVIEW_REQUIRED status can be accepted, current: " + this.status);
        }
        this.status = QuizStatus.READY;
        this.courseOfferingId = targetCourseOfferingId;
        this.updatedAt = Objects.requireNonNull(now, "now must not be null");
    }

    public void reject(Instant now) {
        if (this.status != QuizStatus.REVIEW_REQUIRED) {
            throw new IllegalStateException("Only quizzes in REVIEW_REQUIRED status can be rejected, current: " + this.status);
        }
        this.status = QuizStatus.REJECTED;
        this.updatedAt = Objects.requireNonNull(now, "now must not be null");
    }

    public void publish(Instant now) {
        if (this.creatorRole != QuizCreatorRole.TEACHER) {
            throw new IllegalStateException("Only teachers can publish quizzes");
        }
        this.status = QuizStatus.PUBLISHED;
        this.updatedAt = Objects.requireNonNull(now, "now must not be null");
    }

    public boolean canAttempt() {
        return this.status == QuizStatus.READY || this.status == QuizStatus.PUBLISHED;
    }

    public UUID getId() { return id; }
    public UUID getCreatedBy() { return createdBy; }
    public QuizCreatorRole getCreatorRole() { return creatorRole; }
    public UUID getCourseOfferingId() { return courseOfferingId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getUserPrompt() { return userPrompt; }
    public QuizGenerationType getGenerationType() { return generationType; }
    public QuizStatus getStatus() { return status; }
    public int getQuestionCount() { return questionCount; }
    public UUID getRegeneratedFromQuizId() { return regeneratedFromQuizId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
