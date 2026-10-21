package com.studyflow.review.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "quiz_attempts", schema = "app")
public class QuizAttempt {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private QuizAttemptStatus status;

    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "correct_answers_count", nullable = false)
    private int correctAnswersCount;

    @Column(name = "total_questions_count", nullable = false)
    private int totalQuestionsCount;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected QuizAttempt() {}

    public QuizAttempt(
            UUID id,
            UUID quizId,
            UUID studentId,
            QuizAttemptStatus status,
            BigDecimal score,
            int correctAnswersCount,
            int totalQuestionsCount,
            Instant startedAt,
            Instant submittedAt,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.quizId = Objects.requireNonNull(quizId, "quizId must not be null");
        this.studentId = Objects.requireNonNull(studentId, "studentId must not be null");
        this.status = Objects.requireNonNull(status, "status must not be null");
        this.score = score;
        this.correctAnswersCount = correctAnswersCount;
        this.totalQuestionsCount = totalQuestionsCount;
        this.startedAt = Objects.requireNonNull(startedAt, "startedAt must not be null");
        this.submittedAt = submittedAt;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    }

    public static QuizAttempt start(UUID id, UUID quizId, UUID studentId, int totalQuestionsCount, Instant now) {
        return new QuizAttempt(
                id,
                quizId,
                studentId,
                QuizAttemptStatus.IN_PROGRESS,
                null,
                0,
                totalQuestionsCount,
                now,
                null,
                now,
                now
        );
    }

    public void score(int correctCount, Instant now) {
        if (this.status != QuizAttemptStatus.IN_PROGRESS) {
            throw new IllegalStateException("Attempt has already been submitted or scored, status: " + this.status);
        }
        if (correctCount < 0 || correctCount > this.totalQuestionsCount) {
            throw new IllegalArgumentException("correctCount must be between 0 and totalQuestionsCount");
        }
        this.correctAnswersCount = correctCount;
        if (this.totalQuestionsCount > 0) {
            BigDecimal rawScore = BigDecimal.valueOf((double) correctCount * 100.0 / this.totalQuestionsCount);
            this.score = rawScore.setScale(2, RoundingMode.HALF_UP);
        } else {
            this.score = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        this.status = QuizAttemptStatus.SCORED;
        this.submittedAt = Objects.requireNonNull(now, "now must not be null");
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getQuizId() { return quizId; }
    public UUID getStudentId() { return studentId; }
    public QuizAttemptStatus getStatus() { return status; }
    public BigDecimal getScore() { return score; }
    public int getCorrectAnswersCount() { return correctAnswersCount; }
    public int getTotalQuestionsCount() { return totalQuestionsCount; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
