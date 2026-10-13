package com.studyflow.enrollment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class JoinCourseRequest {

    @NotBlank(message = "Mã tham gia lớp không được để trống")
    @Size(min = 4, max = 50, message = "Mã tham gia lớp không hợp lệ")
    private String joinCode;

    public JoinCourseRequest() {
    }

    public JoinCourseRequest(String joinCode) {
        this.joinCode = joinCode;
    }

    public String getJoinCode() {
        return joinCode;
    }

    public void setJoinCode(String joinCode) {
        this.joinCode = joinCode;
    }
}
