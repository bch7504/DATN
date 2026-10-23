package com.studyflow.review.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CourseOfferingReviewSummaryDTO(
        UUID courseOfferingId,
        int quizCount,
        BigDecimal averageScore,
        Instant latestAttemptAt
) {}
