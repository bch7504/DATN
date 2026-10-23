package com.studyflow.review.application;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SubmitQuizAttemptResult(
        UUID attemptId,
        UUID quizId,
        BigDecimal score,
        int correctAnswersCount,
        int totalQuestionsCount,
        Instant submittedAt,
        List<QuizQuestionReviewDTO> questionReviews
) {}
