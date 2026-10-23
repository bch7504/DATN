package com.studyflow.review.application;

/**
 * Multiple-choice option (A, B, C, D).
 */
public record QuestionOptionDTO(
        int index,
        String text
) {}
