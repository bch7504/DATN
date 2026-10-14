package com.studyflow.enrollment.dto;

import jakarta.validation.constraints.NotBlank;

public record JoinCourseRequest(
        @NotBlank(message = "Mã tham gia không được để trống")
        String joinCode
) {
    public String getJoinCode() {
        return joinCode;
    }
}
