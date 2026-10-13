package com.studyflow.auth.infrastructure;

import com.studyflow.auth.application.port.SecretHasher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public final class BCryptSecretHasher implements SecretHasher {

    private final PasswordEncoder passwordEncoder;

    public BCryptSecretHasher(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public String hash(String rawValue) {
        return passwordEncoder.encode(rawValue);
    }

    @Override
    public boolean matches(String rawValue, String encodedValue) {
        return passwordEncoder.matches(rawValue, encodedValue);
    }
}
