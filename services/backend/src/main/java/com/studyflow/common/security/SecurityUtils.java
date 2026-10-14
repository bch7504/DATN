package com.studyflow.common.security;

import com.studyflow.common.exception.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<UserPrincipal> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    public static UserPrincipal getRequiredCurrentUser() {
        return getCurrentUser().orElseThrow(() ->
                new AppException("UNAUTHORIZED", "Yêu cầu đăng nhập để thực hiện thao tác.", HttpStatus.UNAUTHORIZED)
        );
    }

    public static String getCurrentUserId() {
        return getRequiredCurrentUser().getId();
    }

    public static UserRole getCurrentUserRole() {
        return getRequiredCurrentUser().getRole();
    }

    public static boolean isCurrentUser(String userId) {
        return getCurrentUser().map(u -> u.getId().equals(userId)).orElse(false);
    }
}
