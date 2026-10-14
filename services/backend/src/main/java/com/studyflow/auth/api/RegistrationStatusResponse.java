package com.studyflow.auth.api;

import com.studyflow.auth.application.RegistrationStatus;
import java.time.Instant;

public record RegistrationStatusResponse(
        String status,
        Instant expiresAt,
        Instant resendAvailableAt
) {
    static RegistrationStatusResponse from(RegistrationStatus status) {
        return new RegistrationStatusResponse(
                status.status(),
                status.expiresAt(),
                status.resendAvailableAt()
        );
    }
}
