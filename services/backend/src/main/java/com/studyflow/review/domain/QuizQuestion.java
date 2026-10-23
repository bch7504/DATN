package com.studyflow.review.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "quiz_questions", schema = "app")
public class QuizQuestion {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    private String questionText;

    @Column(name = "option_a", columnDefinition = "TEXT", nullable = false)
    private String optionA;

    @Column(name = "option_b", columnDefinition = "TEXT", nullable = false)
    private String optionB;

    @Column(name = "option_c", columnDefinition = "TEXT", nullable = false)
    private String optionC;

    @Column(name = "option_d", columnDefinition = "TEXT", nullable = false)
    private String optionD;

    @Column(name = "correct_option_index", nullable = false)
    private int correctOptionIndex;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "question_order", nullable = false)
    private int questionOrder;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected QuizQuestion() {}

    public QuizQuestion(
            UUID id,
            UUID quizId,
            String questionText,
            String optionA,
            String optionB,
            String optionC,
            String optionD,
            int correctOptionIndex,
            String explanation,
            int questionOrder,
            Instant createdAt
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.quizId = Objects.requireNonNull(quizId, "quizId must not be null");
        this.questionText = Objects.requireNonNull(questionText, "questionText must not be null");
        this.optionA = Objects.requireNonNull(optionA, "optionA must not be null");
        this.optionB = Objects.requireNonNull(optionB, "optionB must not be null");
        this.optionC = Objects.requireNonNull(optionC, "optionC must not be null");
        this.optionD = Objects.requireNonNull(optionD, "optionD must not be null");
        if (correctOptionIndex < 0 || correctOptionIndex > 3) {
            throw new IllegalArgumentException("correctOptionIndex must be between 0 and 3");
        }
        this.correctOptionIndex = correctOptionIndex;
        this.explanation = explanation;
        this.questionOrder = questionOrder;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
    }

    public boolean isCorrect(Integer selectedOptionIndex) {
        return selectedOptionIndex != null && selectedOptionIndex == this.correctOptionIndex;
    }

    public String getOption(int index) {
        return switch (index) {
            case 0 -> optionA;
            case 1 -> optionB;
            case 2 -> optionC;
            case 3 -> optionD;
            default -> throw new IndexOutOfBoundsException("Option index must be 0..3");
        };
    }

    public UUID getId() { return id; }
    public UUID getQuizId() { return quizId; }
    public String getQuestionText() { return questionText; }
    public String getOptionA() { return optionA; }
    public String getOptionB() { return optionB; }
    public String getOptionC() { return optionC; }
    public String getOptionD() { return optionD; }
    public int getCorrectOptionIndex() { return correctOptionIndex; }
    public String getExplanation() { return explanation; }
    public int getQuestionOrder() { return questionOrder; }
    public Instant getCreatedAt() { return createdAt; }
}
