package com.studyflow.auth.application.port;

public interface SecretHasher {
    String hash(String rawValue);

    boolean matches(String rawValue, String encodedValue);
}
