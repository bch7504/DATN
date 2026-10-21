package com.studyflow.review.dto;

import java.util.UUID;

public record RejectQuizResponse(
        UUID quizId,
        String status
) {}
