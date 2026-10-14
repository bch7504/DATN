package com.studyflow.enrollment.domain;

/**
 * Status of a student course enrollment request.
 * State transition: PENDING -> APPROVED | REJECTED; APPROVED -> REMOVED
 */
public enum EnrollmentStatus {
    PENDING,
    APPROVED,
    REJECTED,
    REMOVED
}
