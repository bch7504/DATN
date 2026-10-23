package com.studyflow.review.application;

import com.studyflow.review.domain.QuizStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record QuizSummaryDTO(
        UUID id,
        String title,
        String description,
        QuizStatus status,
        UUID courseOfferingId,
        int questionCount,
        Instant createdAt,
        int attemptCount,
        BigDecimal highestScore
) {}
