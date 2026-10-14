package com.studyflow.auth.application.port;

import java.time.Instant;

public interface VerificationCodeSender {
    void send(String email, String displayName, String code, Instant expiresAt);
}
