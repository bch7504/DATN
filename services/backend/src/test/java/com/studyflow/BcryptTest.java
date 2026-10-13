package com.studyflow;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BcryptTest {

    @Test
    void generateHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("ptit@demo123");
        System.out.println("BCRYPT_HASH_RESULT=" + hash);
        org.junit.jupiter.api.Assertions.assertTrue(encoder.matches("ptit@demo123", hash));
    }
}
