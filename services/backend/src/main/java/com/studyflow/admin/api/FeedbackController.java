package com.studyflow.admin.api;

import com.studyflow.admin.application.AdminService;
import com.studyflow.common.exception.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Student and Teacher feedback intake; reporter identity comes only from the authenticated JWT. */
@RestController
@RequestMapping("/api/v1")
public class FeedbackController {
    private final AdminService service;

    /** Args: managed Admin service. Input: Spring dependency. Output: controller. Errors: none. */
    public FeedbackController(AdminService service) { this.service = service; }

    /** Args: Student JWT and typed report. Output: 201 OPEN report; insert. Errors: 401/403/422. */
    @PostMapping("/student/feedback-reports")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AdminModels.Feedback> student(@AuthenticationPrincipal Jwt jwt,
            @RequestBody AdminModels.FeedbackInput body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.submitFeedback(actor(jwt), body));
    }

    /** Args: Teacher JWT and typed report. Output: 201 OPEN report; insert. Errors: 401/403/422. */
    @PostMapping("/teacher/feedback-reports")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<AdminModels.Feedback> teacher(@AuthenticationPrincipal Jwt jwt,
            @RequestBody AdminModels.FeedbackInput body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.submitFeedback(actor(jwt), body));
    }

    /** Args: signed JWT subject. Output: account UUID. Errors: 401 INVALID_SESSION. */
    private static UUID actor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) throw invalidSession();
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException exception) { throw invalidSession(); }
    }

    /** Args: none. Output: safe 401 exception. Errors: none. */
    private static ApiException invalidSession() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
    }
}
