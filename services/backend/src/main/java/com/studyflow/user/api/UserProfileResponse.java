package com.studyflow.user.api;

import com.studyflow.user.application.UserProfile;
import com.studyflow.user.domain.UserRole;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String displayName,
        String email,
        String username,
        String timeZone,
        UserRole role
) {
    /**
     * Maps the application projection to the stable public response schema.
     *
     * @param profile safe application-level profile
     * @return public API response with no credential or account-status fields
     */
    public static UserProfileResponse from(UserProfile profile) {
        return new UserProfileResponse(
                profile.id(),
                profile.displayName(),
                profile.email(),
                profile.username(),
                profile.timeZone(),
                profile.role()
        );
    }
}
