package com.studyflow.user.application;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserStatus;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private static final Set<String> AVAILABLE_TIME_ZONES = ZoneId.getAvailableZoneIds();

    private final UserAccountStore users;
    private final Clock clock;

    public UserProfileService(UserAccountStore users, Clock clock) {
        this.users = users;
        this.clock = clock;
    }

    /**
     * Returns the current active user's safe profile projection.
     *
     * @param userId required authenticated user identifier from the verified JWT subject
     * @return profile containing identity, display, time-zone and role fields
     * @throws ApiException with 403 when the account no longer exists or is not active
     */
    @Transactional(readOnly = true)
    public UserProfile getProfile(UUID userId) {
        return UserProfile.from(requireActive(userId));
    }

    /**
     * Updates only fields that the current user is allowed to edit.
     *
     * @param userId required authenticated user identifier from the verified JWT subject
     * @param command optional display name and/or IANA time zone; at least one must be supplied
     * @return the updated safe profile projection
     * @throws ApiException with 403 for an unavailable account or 422 for an empty patch/invalid time zone
     * Side effect: updates full_name, time_zone and updated_at for the authenticated account only.
     */
    @Transactional
    public UserProfile updateProfile(UUID userId, UpdateProfileCommand command) {
        UserAccount current = requireActiveForUpdate(userId);
        if (command.displayName() == null && command.timeZone() == null) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "PROFILE_UPDATE_EMPTY",
                    "Cần cung cấp ít nhất một thông tin cần cập nhật"
            );
        }

        String displayName = command.displayName() == null
                ? current.fullName()
                : validateDisplayName(command.displayName());
        String timeZone = command.timeZone() == null
                ? current.timeZone()
                : validateTimeZone(command.timeZone());

        UserAccount updated = current.updateProfile(displayName, timeZone, clock.instant());
        return UserProfile.from(users.save(updated));
    }

    private UserAccount requireActive(UUID userId) {
        return users.findById(userId)
                .filter(account -> account.status() == UserStatus.ACTIVE)
                .orElseThrow(UserProfileService::accountUnavailable);
    }

    private UserAccount requireActiveForUpdate(UUID userId) {
        return users.findByIdForUpdate(userId)
                .filter(account -> account.status() == UserStatus.ACTIVE)
                .orElseThrow(UserProfileService::accountUnavailable);
    }

    private static String validateDisplayName(String rawDisplayName) {
        String displayName = rawDisplayName.strip();
        if (displayName.length() < 2 || displayName.length() > 100) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "INVALID_DISPLAY_NAME",
                    "Tên hiển thị phải có từ 2 đến 100 ký tự"
            );
        }
        return displayName;
    }

    private static String validateTimeZone(String rawTimeZone) {
        String timeZone = rawTimeZone.strip();
        try {
            ZoneId.of(timeZone);
        } catch (DateTimeException exception) {
            throw invalidTimeZone();
        }
        if (!AVAILABLE_TIME_ZONES.contains(timeZone)) {
            throw invalidTimeZone();
        }
        return timeZone;
    }

    private static ApiException invalidTimeZone() {
        return new ApiException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "INVALID_TIME_ZONE",
                "Múi giờ phải là mã IANA hợp lệ"
        );
    }

    private static ApiException accountUnavailable() {
        return new ApiException(
                HttpStatus.FORBIDDEN,
                "ACCOUNT_UNAVAILABLE",
                "Tài khoản không tồn tại hoặc đã bị khóa"
        );
    }
}
