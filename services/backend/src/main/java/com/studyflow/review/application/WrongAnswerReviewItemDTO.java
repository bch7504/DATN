package com.studyflow.review.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Projections of wrong answers for "Nội dung cần ôn lại", grounded strictly on document+page.
 */
public record WrongAnswerReviewItemDTO(
        UUID questionId,
        String questionText,
        Integer studentSelectedOptionIndex,
        String studentSelectedOptionText,
        int correctOptionIndex,
        String correctOptionText,
        String explanation,
        List<QuizCitationSourceDTO> citations,
        Instant lastAttemptedAt
) {}
