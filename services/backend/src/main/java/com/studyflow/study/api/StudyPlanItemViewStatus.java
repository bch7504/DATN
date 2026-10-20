package com.studyflow.study.api;

/** Public display status; OVERDUE is derived from an unfinished item's deadline, not persisted. */
public enum StudyPlanItemViewStatus {
    TODO,
    OVERDUE,
    COMPLETED,
    CANCELLED,
    DELETED
}
