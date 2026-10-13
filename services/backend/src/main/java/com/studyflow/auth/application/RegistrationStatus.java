package com.studyflow.auth.application;

import java.time.Instant;

public record RegistrationStatus(
        String status,
        Instant expiresAt,
        Instant resendAvailableAt
) {
    public static RegistrationStatus verificationRequired(Instant expiresAt, Instant resendAvailableAt) {
        return new RegistrationStatus("VERIFICATION_REQUIRED", expiresAt, resendAvailableAt);
    }
}
