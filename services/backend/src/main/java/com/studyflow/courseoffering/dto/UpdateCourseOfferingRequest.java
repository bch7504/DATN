package com.studyflow.courseoffering.dto;

import jakarta.validation.constraints.Size;

public record UpdateCourseOfferingRequest(
        @Size(max = 50, message = "Mã lớp không vượt quá 50 ký tự")
        String code,

        @Size(max = 255, message = "Tên lớp không vượt quá 255 ký tự")
        String name
) {
    public String getCode() {
        return code;
    }
    public String getName() {
        return name;
    }
}
