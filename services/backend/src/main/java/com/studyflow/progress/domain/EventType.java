package com.studyflow.progress.domain;

/**
 * Valid activity event types that can sustain Study Streak and increment Daily Goal actuals.
 * Only VIEW_PAGE, STUDY_TASK_COMPLETED, and QUIZ_COMPLETED are allowed per system rules.
 */
public enum EventType {
    VIEW_PAGE,
    STUDY_TASK_COMPLETED,
    QUIZ_COMPLETED
}
