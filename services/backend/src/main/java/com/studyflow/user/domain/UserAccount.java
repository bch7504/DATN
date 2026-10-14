package com.studyflow.user.domain;

import java.time.Instant;
import java.util.UUID;

public record UserAccount(
        UUID id,
        String email,
        String username,
        String passwordHash,
        String fullName,
        String timeZone,
        UserRole role,
        UserStatus status,
        Instant emailVerifiedAt,
        Instant createdAt,
        Instant updatedAt
) {
    /**
     * Creates a verified public Student account.
     *
     * @param email normalized institutional email
     * @param passwordHash BCrypt password hash
     * @param fullName non-blank display name
     * @param now creation and verification instant
     * @return a new active Student account with the default time zone
     */
    public static UserAccount verifiedStudent(
            String email,
            String passwordHash,
            String fullName,
            Instant now
    ) {
        String username = email.substring(0, email.indexOf('@'));
        return new UserAccount(
                UUID.randomUUID(),
                email,
                username,
                passwordHash,
                fullName,
                "Asia/Ho_Chi_Minh",
                UserRole.STUDENT,
                UserStatus.ACTIVE,
                now,
                now,
                now
        );
    }

    /**
     * Replaces user-editable profile fields while preserving identity and authorization data.
     *
     * @param newFullName normalized non-blank display name
     * @param newTimeZone validated IANA time-zone identifier
     * @param now update instant
     * @return an updated immutable account value
     */
    public UserAccount updateProfile(String newFullName, String newTimeZone, Instant now) {
        return new UserAccount(
                id,
                email,
                username,
                passwordHash,
                newFullName,
                newTimeZone,
                role,
                status,
                emailVerifiedAt,
                createdAt,
                now
        );
    }
}
