package com.studyflow.enrollment.dto;

import jakarta.validation.constraints.Size;

public class DecisionEnrollmentRequest {

    @Size(max = 500, message = "Lý do tối đa 500 ký tự")
    private String reason;

    public DecisionEnrollmentRequest() {
    }

    public DecisionEnrollmentRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
