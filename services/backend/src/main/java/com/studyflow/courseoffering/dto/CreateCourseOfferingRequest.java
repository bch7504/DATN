package com.studyflow.courseoffering.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request to create a Teacher-owned course offering.
 * Args/input: subjectId and semesterId are required catalog UUIDs; code (up to 50 characters)
 * and name (up to 255 characters) are optional. Null or blank optional fields use the
 * subject-based defaults in CourseOfferingService. The authenticated Teacher is the owner.
 * Output: the controller returns HTTP 201 with offering metadata and a one-time join code.
 * Errors: invalid IDs or overlong fields return 422; unavailable catalogs and duplicate
 * codes are handled by the service with 404 or 409 respectively.
 */
public record CreateCourseOfferingRequest(
        @NotNull(message = "ID môn học không được để trống")
        UUID subjectId,

        @NotNull(message = "ID học kỳ không được để trống")
        UUID semesterId,

        @Size(max = 50, message = "Mã lớp không vượt quá 50 ký tự")
        String code,

        @Size(max = 255, message = "Tên lớp không vượt quá 255 ký tự")
        String name
) {
    public UUID getSubjectId() {
        return subjectId;
    }
    public UUID getSemesterId() {
        return semesterId;
    }
    public String getCode() {
        return code;
    }
    public String getName() {
        return name;
    }
}
