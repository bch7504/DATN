package com.studyflow.review.domain;

/**
 * Lifecycle status of a Quiz.
 */
public enum QuizStatus {
    GENERATING,
    REVIEW_REQUIRED,
    READY,
    PUBLISHED,
    REJECTED,
    GENERATION_FAILED,
    ARCHIVED
}
