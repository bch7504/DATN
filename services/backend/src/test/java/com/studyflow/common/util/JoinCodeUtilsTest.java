package com.studyflow.common.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JoinCodeUtilsTest {

    @Test
    @DisplayName("Should generate code with prefix and formatted length")
    void shouldGenerateRandomCode() {
        String code = JoinCodeUtils.generateRandomCode("INT1340", 6);
        assertNotNull(code);
        assertTrue(code.startsWith("INT1340-"));
        assertEquals("INT1340-".length() + 6, code.length());
    }

    @Test
    @DisplayName("Should normalize user input by trimming and uppercasing")
    void shouldNormalizeCode() {
        assertEquals("TEST-1234", JoinCodeUtils.normalize("  test-1234  "));
        assertEquals("ABC", JoinCodeUtils.normalize("abc"));
        assertEquals("", JoinCodeUtils.normalize(null));
    }

    @Test
    @DisplayName("Should produce consistent SHA-256 hex hash")
    void shouldProduceSha256Hex() {
        String code = "INT1340-ABCDEF";
        String hash1 = JoinCodeUtils.sha256Hex(code);
        String hash2 = JoinCodeUtils.sha256Hex(code);

        assertNotNull(hash1);
        assertEquals(64, hash1.length());
        assertEquals(hash1, hash2);

        // Different code must have different hash
        assertNotEquals(hash1, JoinCodeUtils.sha256Hex("INT1340-XYZ123"));
    }

    @Test
    @DisplayName("Should extract last 4 characters as hint")
    void shouldExtractHint() {
        assertEquals("CDEF", JoinCodeUtils.extractHint("INT1340-ABCDEF"));
        assertEquals("12", JoinCodeUtils.extractHint("12"));
        assertEquals("", JoinCodeUtils.extractHint(null));
    }
}
