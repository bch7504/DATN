package com.studyflow.review.application;

import java.util.List;
import java.util.UUID;

/**
 * Question review returned after submission with correct answer and explanation.
 */
public record QuizQuestionReviewDTO(
        UUID questionId,
        int questionOrder,
        String questionText,
        List<QuestionOptionDTO> options,
        Integer selectedOptionIndex,
        int correctOptionIndex,
        boolean isCorrect,
        String explanation,
        List<QuizCitationSourceDTO> citations
) {}
