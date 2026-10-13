package com.studyflow.auth.application;

import java.time.Instant;

public record SessionTokens(
        String accessToken,
        Instant accessTokenExpiresAt,
        String refreshToken,
        Instant refreshTokenExpiresAt
) {
    @Override
    public String toString() {
        return "SessionTokens[accessToken=<redacted>, accessTokenExpiresAt=" + accessTokenExpiresAt
                + ", refreshToken=<redacted>, refreshTokenExpiresAt=" + refreshTokenExpiresAt + "]";
    }
}
