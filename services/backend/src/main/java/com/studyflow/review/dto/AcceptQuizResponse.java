package com.studyflow.review.dto;

import java.util.UUID;

public record AcceptQuizResponse(
        UUID quizId,
        String status,
        UUID courseOfferingId
) {}
