package com.studyflow.progress.presentation;

import com.studyflow.common.exception.ApiException;
import com.studyflow.progress.application.StudentDashboardService;
import com.studyflow.progress.dto.StudentDashboardResponse;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Student dashboard API backed by verified learning and class data. */
@RestController
@RequestMapping("/api/v1/student/dashboard")
@PreAuthorize("hasRole('STUDENT')")
public class StudentDashboardController {
    private final StudentDashboardService dashboard;

    /** Args: dashboard service. Input: Spring managed dependency. Output: controller. Errors: none. */
    public StudentDashboardController(StudentDashboardService dashboard) {
        this.dashboard = dashboard;
    }

    /** Args: authenticated Student JWT. Input: current authorized app records.
     * Output: 200 complete dashboard DTO. Errors: 401 invalid session, 403 wrong role, persistence failure. */
    @GetMapping
    public StudentDashboardResponse get(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        }
        UUID studentId;
        try {
            studentId = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        }
        return dashboard.get(studentId);
    }
}
