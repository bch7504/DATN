package com.studyflow.review.application;

import java.util.Map;
import java.util.UUID;

public record SubmitQuizAttemptCommand(
        UUID attemptId,
        UUID studentId,
        Map<UUID, Integer> selectedAnswers
) {}
