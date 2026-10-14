package com.studyflow.common.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

/**
 * Utility for generating, normalizing, and securely hashing Course Offering Join Codes.
 */
public final class JoinCodeUtils {

    private static final String ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Base32 avoiding ambiguous chars 0, 1, I, O
    private static final SecureRandom RANDOM = new SecureRandom();

    private JoinCodeUtils() {
    }

    /**
     * Normalizes a raw join code by trimming whitespace and converting to uppercase.
     *
     * @param rawCode raw user input string
     * @return normalized join code
     */
    public static String normalize(String rawCode) {
        if (rawCode == null) {
            return "";
        }
        return rawCode.trim().toUpperCase();
    }

    /**
     * Generates a random, user-friendly join code with prefix.
     *
     * @param prefix subject code prefix (e.g. "DBI" or "INT")
     * @param length length of random suffix
     * @return generated join code (e.g. "DBI-8K9M2P")
     */
    public static String generateRandomCode(String prefix, int length) {
        StringBuilder sb = new StringBuilder();
        if (prefix != null && !prefix.isBlank()) {
            String cleanPrefix = prefix.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
            if (cleanPrefix.length() > 8) {
                cleanPrefix = cleanPrefix.substring(0, 8);
            }
            sb.append(cleanPrefix).append("-");
        }

        for (int i = 0; i < length; i++) {
            int index = RANDOM.nextInt(ALPHABET.length());
            sb.append(ALPHABET.charAt(index));
        }
        return sb.toString();
    }

    /**
     * Computes SHA-256 hexadecimal digest of normalized join code.
     *
     * @param normalizedCode normalized join code
     * @return 64-character lowercase hex string
     */
    public static String sha256Hex(String normalizedCode) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalizedCode.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available in runtime", e);
        }
    }

    /**
     * Extracts last 3-4 characters of the code as a hint.
     *
     * @param code raw or normalized code
     * @return hint string
     */
    public static String extractHint(String code) {
        if (code == null) {
            return "";
        }
        if (code.length() < 3) {
            return code;
        }
        return code.substring(code.length() - Math.min(4, code.length()));
    }
}
