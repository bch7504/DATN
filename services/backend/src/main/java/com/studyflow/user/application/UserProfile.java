package com.studyflow.user.application;

import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserRole;
import java.util.UUID;

public record UserProfile(
        UUID id,
        String displayName,
        String email,
        String username,
        String timeZone,
        UserRole role
) {
    /**
     * Builds the public profile projection without exposing password or account internals.
     *
     * @param account active account loaded inside the authorized user scope
     * @return safe profile projection for the public API
     */
    public static UserProfile from(UserAccount account) {
        return new UserProfile(
                account.id(),
                account.fullName(),
                account.email(),
                account.username(),
                account.timeZone(),
                account.role()
        );
    }
}
