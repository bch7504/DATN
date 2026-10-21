package com.studyflow.progress.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Domain entity representing daily learning targets configured by a student.
 */
@Entity(name = "DailyGoal")
@Table(schema = "app", name = "daily_goals")
public class DailyGoal {

    public static final int DEFAULT_PAGE_TARGET = 5;
    public static final int DEFAULT_QUIZ_TARGET = 10;
    public static final int DEFAULT_TASK_TARGET = 2;

    @Id
    private UUID id;

    @Column(name = "student_id", nullable = false, unique = true)
    private UUID studentId;

    @Column(name = "page_target", nullable = false)
    private int pageTarget;

    @Column(name = "quiz_question_target", nullable = false)
    private int quizQuestionTarget;

    @Column(name = "task_target", nullable = false)
    private int taskTarget;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DailyGoal() {
    }

    /**
     * Args: id, studentId, pageTarget, quizQuestionTarget, taskTarget, createdAt, updatedAt.
     * Input: valid student identifier and target counts within legal ranges.
     * Output: initialized DailyGoal domain instance.
     * Errors: IllegalArgumentException if target values violate system bounds.
     */
    public DailyGoal(
            UUID id,
            UUID studentId,
            int pageTarget,
            int quizQuestionTarget,
            int taskTarget,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.studentId = Objects.requireNonNull(studentId, "studentId must not be null");
        validateTargets(pageTarget, quizQuestionTarget, taskTarget);
        this.pageTarget = pageTarget;
        this.quizQuestionTarget = quizQuestionTarget;
        this.taskTarget = taskTarget;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    }

    /**
     * Factory for creating initial default targets when a student first accesses the goal feature.
     * Args: studentId, now.
     * Input: valid student UUID and current timestamp.
     * Output: default DailyGoal with 5 pages, 10 quiz questions, 2 tasks.
     * Errors: NullPointerException if parameters are null.
     */
    public static DailyGoal defaultForStudent(UUID studentId, Instant now) {
        return new DailyGoal(
                UUID.randomUUID(),
                studentId,
                DEFAULT_PAGE_TARGET,
                DEFAULT_QUIZ_TARGET,
                DEFAULT_TASK_TARGET,
                now,
                now
        );
    }

    /**
     * Args: new pageTarget, quizQuestionTarget, taskTarget, and update timestamp now.
     * Input: target values within allowed ranges (page: 0..100, quiz: 0..200, task: 0..50, total > 0).
     * Output: void; updates fields and updatedAt timestamp.
     * Errors: IllegalArgumentException if validation fails.
     */
    public void updateTargets(int pageTarget, int quizQuestionTarget, int taskTarget, Instant now) {
        validateTargets(pageTarget, quizQuestionTarget, taskTarget);
        this.pageTarget = pageTarget;
        this.quizQuestionTarget = quizQuestionTarget;
        this.taskTarget = taskTarget;
        this.updatedAt = Objects.requireNonNull(now, "updatedAt must not be null");
    }

    /**
     * Validates that targets conform to specifications in docs/specs/04-plan-progress-review.md.
     */
    public static void validateTargets(int pageTarget, int quizQuestionTarget, int taskTarget) {
        if (pageTarget < 0 || pageTarget > 100) {
            throw new IllegalArgumentException("pageTarget must be between 0 and 100");
        }
        if (quizQuestionTarget < 0 || quizQuestionTarget > 200) {
            throw new IllegalArgumentException("quizQuestionTarget must be between 0 and 200");
        }
        if (taskTarget < 0 || taskTarget > 50) {
            throw new IllegalArgumentException("taskTarget must be between 0 and 50");
        }
        if (pageTarget + quizQuestionTarget + taskTarget <= 0) {
            throw new IllegalArgumentException("Total target must be strictly positive (greater than 0)");
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public int getPageTarget() {
        return pageTarget;
    }

    public int getQuizQuestionTarget() {
        return quizQuestionTarget;
    }

    public int getTaskTarget() {
        return taskTarget;
    }

    public int getTotalTarget() {
        return pageTarget + quizQuestionTarget + taskTarget;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
