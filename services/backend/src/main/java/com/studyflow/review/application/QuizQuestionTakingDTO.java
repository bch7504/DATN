package com.studyflow.review.application;

import java.util.List;
import java.util.UUID;

/**
 * Question sent to client when starting or taking an attempt.
 * OMITTING correct answer and explanation to prevent cheating.
 */
public record QuizQuestionTakingDTO(
        UUID id,
        int questionOrder,
        String questionText,
        List<QuestionOptionDTO> options
) {}
