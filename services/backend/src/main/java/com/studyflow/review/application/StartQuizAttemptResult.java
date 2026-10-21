package com.studyflow.review.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StartQuizAttemptResult(
        UUID attemptId,
        UUID quizId,
        String quizTitle,
        Instant startedAt,
        int totalQuestions,
        List<QuizQuestionTakingDTO> questions
) {}
