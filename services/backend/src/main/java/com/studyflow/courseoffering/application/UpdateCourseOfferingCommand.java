package com.studyflow.courseoffering.application;

/**
 * Partial metadata update for a teacher-owned Course Offering.
 *
 * Contract:
 * - args: code and name are optional; null means keep the current value.
 * - input: values have already passed DTO size validation; at least one value
 *   must be present and non-blank.
 * - output: the updated CourseOffering is persisted and returned by the caller.
 * - errors: ValidationException when no usable field is provided;
 *   ConflictException when the offering is not ACTIVE or the code is duplicated.
 */
public record UpdateCourseOfferingCommand(String code, String name) {
}
