package com.studyflow.notification.api;

import com.studyflow.common.exception.ApiException;
import com.studyflow.notification.application.NotificationService;
import com.studyflow.notification.domain.StudentNotification;
import com.studyflow.study.application.PageResult;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
public class NotificationController {

    private final NotificationService service;

    /**
     * Creates the Student/Teacher notification HTTP adapter.
     *
     * @param service application service enforcing account and ownership rules
     */
    public NotificationController(NotificationService service) {
        this.service = service;
    }

    /**
     * Lists owner-scoped in-app notifications.
     *
     * @param jwt verified JWT with UUID subject
     * @param unreadOnly optional unread filter, default false
     * @param page zero-based page index
     * @param size page size from 1 to 100
     * @return HTTP 200 standard page response
     */
    @GetMapping("/api/v1/student/notifications")
    public NotificationPageResponse list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        PageResult<StudentNotification> result = service.list(userId(jwt), unreadOnly, page, size);
        return new NotificationPageResponse(
                result.items().stream().map(NotificationResponse::from).toList(),
                result.page(), result.size(), result.totalItems(), result.totalPages()
        );
    }

    /**
     * Args: verified teacher JWT, unread filter (default false), page (default 0) and size (default 20, 1..100).
     * Input: authenticated TEACHER session. Output: HTTP 200 owner-scoped page; no side effects.
     * Errors: 401 invalid session, 403 wrong/unavailable role, 422 invalid pagination.
     */
    @GetMapping("/api/v1/teacher/notifications")
    public NotificationPageResponse listTeacher(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        PageResult<StudentNotification> result = service.listTeacher(userId(jwt), unreadOnly, page, size);
        return new NotificationPageResponse(
                result.items().stream().map(NotificationResponse::from).toList(),
                result.page(), result.size(), result.totalItems(), result.totalPages()
        );
    }

    /**
     * Marks an owner-scoped notification as read idempotently.
     *
     * @param jwt verified JWT with UUID subject
     * @param notificationId required notification UUID
     * @return HTTP 200 updated notification
     */
    @PatchMapping("/api/v1/student/notifications/{notificationId}/read")
    public NotificationResponse markRead(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID notificationId
    ) {
        return NotificationResponse.from(service.markRead(userId(jwt), notificationId));
    }

    /**
     * Args: verified teacher JWT and required notification UUID. Input: authenticated TEACHER session.
     * Output: HTTP 200 updated safe notification. Errors: 401/403 or owner-safe 404.
     */
    @PatchMapping("/api/v1/teacher/notifications/{notificationId}/read")
    public NotificationResponse markTeacherRead(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID notificationId) {
        return NotificationResponse.from(service.markTeacherRead(userId(jwt), notificationId));
    }

    /** Args: verified JWT. Input: subject UUID claim. Output: user UUID; errors: 401 invalid session. */
    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw invalidSession();
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw invalidSession();
        }
    }

    /** Args: none. Input: invalid session context. Output: 401 ApiException; errors: none. */
    private static ApiException invalidSession() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
    }
}
