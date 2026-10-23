package com.studyflow.review.api;

import com.studyflow.common.api.RequestIdFilter;
import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.review.application.AiQuizService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Direct Student AI Quiz generation; this route never creates a chat conversation. */
@RestController
@RequestMapping("/api/v1/quizzes")
@PreAuthorize("hasRole('STUDENT')")
public class StudentQuizGenerationController {
    private final AiQuizService service;

    /** Args: Quiz service. Input: Spring dependency. Output: controller. Errors: none. */
    public StudentQuizGenerationController(AiQuizService service) { this.service = service; }

    /** Input: owner-scoped Personal PDF IDs, prompt and idempotency key. Output: HTTP 200 REVIEW_REQUIRED draft. Errors: 401/403/404/409/422/502/503. */
    @PostMapping
    public QuizApiModels.Draft create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody QuizApiModels.CreateRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestAttribute(name = RequestIdFilter.ATTRIBUTE) String requestId
    ) {
        return service.createStudent(userId(jwt), request.selectedDocumentIds(), request.prompt(), requestId,
                idempotencyKey(idempotencyKey));
    }

    /** Args: raw header. Input: caller key. Output: trimmed 8-255 character key. Errors: 422 for invalid length. */
    static String idempotencyKey(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() < 8 || normalized.length() > 255) {
            throw new ValidationException("INVALID_IDEMPOTENCY_KEY", "Khóa chống gửi trùng không hợp lệ.");
        }
        return normalized;
    }

    /** Args: authenticated JWT. Input: UUID subject. Output: actor UUID. Errors: 401 for missing/malformed subject. */
    static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        }
    }
}
