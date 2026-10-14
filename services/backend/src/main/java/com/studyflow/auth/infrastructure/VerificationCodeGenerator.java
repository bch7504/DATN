package com.studyflow.auth.infrastructure;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

@Component
public final class VerificationCodeGenerator {

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates a cryptographically strong six-digit decimal OTP.
     *
     * @return a string in the inclusive range 000000..999999
     */
    public String generate() {
        return "%06d".formatted(secureRandom.nextInt(1_000_000));
    }
}
