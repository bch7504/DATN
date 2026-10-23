package com.studyflow.material.api;

import com.studyflow.common.api.RequestIdFilter;
import com.studyflow.common.exception.ApiException;
import com.studyflow.material.application.CourseMaterialTutorService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Student-only public API for grounded Course Material PDF questions. */
@RestController
@RequestMapping("/api/v1/student/materials")
@PreAuthorize("hasRole('STUDENT')")
public class StudentCourseMaterialTutorController {
    private final CourseMaterialTutorService service;

    public StudentCourseMaterialTutorController(CourseMaterialTutorService service) {
        this.service = service;
    }

    /**
     * Args: authenticated JWT, document ID, 1-based page, validated question and server request ID.
     * Input: Student must have APPROVED enrollment and active publication. Output: 200 ANSWERED or
     * NO_EVIDENCE. Errors: 401/403/404/409/422, 502 invalid AI citation, 503 unavailable AI.
     */
    @PostMapping("/{documentId}/pages/{pageNumber}/tutor")
    public CourseMaterialTutorResponse ask(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID documentId,
            @PathVariable int pageNumber,
            @Valid @RequestBody CourseMaterialTutorRequest request,
            @RequestAttribute(name = RequestIdFilter.ATTRIBUTE) String requestId
    ) {
        return service.ask(userId(jwt), documentId, pageNumber, request.question(), requestId);
    }

    private static UUID userId(Jwt jwt) {
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
