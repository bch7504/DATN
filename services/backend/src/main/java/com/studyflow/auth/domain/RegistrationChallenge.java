package com.studyflow.auth.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

public record RegistrationChallenge(
        UUID id,
        String email,
        String displayName,
        String passwordHash,
        String codeHash,
        Instant expiresAt,
        Instant resendAvailableAt,
        int attemptsRemaining,
        Instant consumedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static RegistrationChallenge issue(
            String email,
            String displayName,
            String passwordHash,
            String codeHash,
            Instant now,
            Duration ttl,
            Duration resendCooldown,
            int attempts
    ) {
        return new RegistrationChallenge(
                UUID.randomUUID(),
                email,
                displayName,
                passwordHash,
                codeHash,
                now.plus(ttl),
                now.plus(resendCooldown),
                attempts,
                null,
                now,
                now
        );
    }

    public RegistrationChallenge reissue(
            String newDisplayName,
            String newPasswordHash,
            String newCodeHash,
            Instant now,
            Duration ttl,
            Duration resendCooldown,
            int attempts
    ) {
        return new RegistrationChallenge(
                id,
                email,
                newDisplayName,
                newPasswordHash,
                newCodeHash,
                now.plus(ttl),
                now.plus(resendCooldown),
                attempts,
                null,
                createdAt,
                now
        );
    }

    public RegistrationChallenge failedAttempt(Instant now) {
        return new RegistrationChallenge(
                id, email, displayName, passwordHash, codeHash, expiresAt, resendAvailableAt,
                Math.max(0, attemptsRemaining - 1), consumedAt, createdAt, now
        );
    }

    public RegistrationChallenge consume(Instant now) {
        return new RegistrationChallenge(
                id, email, displayName, passwordHash, codeHash, expiresAt, resendAvailableAt,
                attemptsRemaining, now, createdAt, now
        );
    }

    public boolean isConsumed() {
        return consumedAt != null;
    }
}
