package com.studyflow.auth.domain;

import java.time.Instant;
import java.util.UUID;

public record RefreshSession(
        UUID id,
        UUID userId,
        String tokenHash,
        Instant expiresAt,
        Instant revokedAt,
        UUID replacedById,
        Instant createdAt
) {
    public static RefreshSession active(UUID userId, String tokenHash, Instant expiresAt, Instant now) {
        return new RefreshSession(UUID.randomUUID(), userId, tokenHash, expiresAt, null, null, now);
    }

    public RefreshSession revoke(Instant now, UUID replacementId) {
        return new RefreshSession(id, userId, tokenHash, expiresAt, now, replacementId, createdAt);
    }

    public boolean canRotateAt(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }
}
