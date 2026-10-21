package com.studyflow.review.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "quiz_answers", schema = "app")
public class QuizAnswer {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "attempt_id", nullable = false)
    private UUID attemptId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "selected_option_index")
    private Integer selectedOptionIndex;

    @Column(name = "is_correct", nullable = false)
    private boolean isCorrect;

    @Column(name = "score", precision = 5, scale = 2, nullable = false)
    private BigDecimal score;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected QuizAnswer() {}

    public QuizAnswer(
            UUID id,
            UUID attemptId,
            UUID questionId,
            Integer selectedOptionIndex,
            boolean isCorrect,
            BigDecimal score,
            Instant createdAt
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.attemptId = Objects.requireNonNull(attemptId, "attemptId must not be null");
        this.questionId = Objects.requireNonNull(questionId, "questionId must not be null");
        this.selectedOptionIndex = selectedOptionIndex;
        this.isCorrect = isCorrect;
        this.score = Objects.requireNonNull(score, "score must not be null");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
    }

    public static QuizAnswer of(
            UUID id,
            UUID attemptId,
            UUID questionId,
            Integer selectedOptionIndex,
            boolean isCorrect,
            BigDecimal score,
            Instant createdAt
    ) {
        return new QuizAnswer(id, attemptId, questionId, selectedOptionIndex, isCorrect, score, createdAt);
    }

    public UUID getId() { return id; }
    public UUID getAttemptId() { return attemptId; }
    public UUID getQuestionId() { return questionId; }
    public Integer getSelectedOptionIndex() { return selectedOptionIndex; }
    public boolean isCorrect() { return isCorrect; }
    public BigDecimal getScore() { return score; }
    public Instant getCreatedAt() { return createdAt; }
}
