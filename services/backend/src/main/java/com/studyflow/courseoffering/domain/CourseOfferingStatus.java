package com.studyflow.courseoffering.domain;

/**
 * Status of a course offering according to docs/backend-implementation-plan.md Section 5.
 * State transition: ACTIVE -> LOCKED | ARCHIVED
 */
public enum CourseOfferingStatus {
    ACTIVE,
    LOCKED,
    ARCHIVED
}
