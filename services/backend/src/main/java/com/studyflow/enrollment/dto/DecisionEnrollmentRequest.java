package com.studyflow.enrollment.dto;

public record DecisionEnrollmentRequest(
        String reason
) {
    public String getReason() {
        return reason;
    }
}
