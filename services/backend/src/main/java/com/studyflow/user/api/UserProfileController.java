package com.studyflow.user.api;

import com.studyflow.common.exception.ApiException;
import com.studyflow.user.application.UpdateProfileCommand;
import com.studyflow.user.application.UserProfileService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class UserProfileController {

    private final UserProfileService profiles;

    public UserProfileController(UserProfileService profiles) {
        this.profiles = profiles;
    }

    /**
     * Gets the authenticated user's profile.
     *
     * @param jwt verified access JWT supplied by Spring Security
     * @return HTTP 200 profile response
     * @throws ApiException with 401 for an invalid subject or 403 when the account is unavailable
     */
    @GetMapping
    public UserProfileResponse getProfile(@AuthenticationPrincipal Jwt jwt) {
        return UserProfileResponse.from(profiles.getProfile(userId(jwt)));
    }

    /**
     * Updates the authenticated user's editable profile fields.
     *
     * @param jwt verified access JWT supplied by Spring Security
     * @param request optional display name and/or IANA time zone; role/status/email are never accepted
     * @return HTTP 200 updated profile response
     * @throws ApiException with 401, 403 or 422 when authorization/account/input rules fail
     */
    @PatchMapping
    public UserProfileResponse updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return UserProfileResponse.from(profiles.updateProfile(
                userId(jwt),
                new UpdateProfileCommand(request.displayName(), request.timeZone())
        ));
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw invalidSubject();
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw invalidSubject();
        }
    }

    private static ApiException invalidSubject() {
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_SESSION",
                "Phiên đăng nhập không hợp lệ"
        );
    }
}
