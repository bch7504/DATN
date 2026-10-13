package com.studyflow.courseoffering.dto;

import jakarta.validation.constraints.Size;

/**
 * Request body for partial Course Offering metadata updates.
 *
 * Contract:
 * - code: optional, maximum 50 characters; null keeps the current code.
 * - name: optional, maximum 255 characters; null keeps the current name.
 * - at least one supplied value must be non-blank.
 */
public class UpdateCourseOfferingRequest {

    @Size(max = 50, message = "Mã lớp tối đa 50 ký tự")
    private String code;

    @Size(max = 255, message = "Tên lớp tối đa 255 ký tự")
    private String name;

    public UpdateCourseOfferingRequest() {
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
