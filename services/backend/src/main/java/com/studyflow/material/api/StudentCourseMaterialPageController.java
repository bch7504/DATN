package com.studyflow.material.api;

import com.studyflow.common.exception.ApiException;
import com.studyflow.material.application.CourseMaterialPageService;
import com.studyflow.material.application.CourseMaterialPageService.PageNote;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Student API for owner-scoped PDF page notes and authorized view events. */
@RestController
@RequestMapping("/api/v1/student/materials/{documentId}/pages/{pageNumber}")
@PreAuthorize("hasRole('STUDENT')")
public class StudentCourseMaterialPageController {
    private final CourseMaterialPageService pages;

    /** Args: required page service. Input: Spring managed dependency. Output: initialized controller. Errors: none. */
    public StudentCourseMaterialPageController(CourseMaterialPageService pages) {
        this.pages = pages;
    }

    /** Args: Student JWT, document UUID and 1-based page. Output: 200 note or empty note.
     * Input: current authorized publication. Errors: 401/403/404/409/422. */
    @GetMapping("/note")
    public PageNote getNote(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId,
                            @PathVariable int pageNumber) {
        return pages.readNote(userId(jwt), documentId, pageNumber);
    }

    /** Args: Student JWT, document UUID, 1-based page and {content} body. Output: 200 saved note.
     * Input: current authorized publication; content <= 10000 characters. Errors: 401/403/404/409/422. */
    @PutMapping("/note")
    public PageNote putNote(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId,
                            @PathVariable int pageNumber, @RequestBody NoteRequest request) {
        return pages.saveNote(userId(jwt), documentId, pageNumber, request.content());
    }

    /** Args: Student JWT, document UUID, 1-based page and required Idempotency-Key header.
     * Input: current authorized publication. Output: 204; one page/day event at most.
     * Errors: 401/403/404/409/422. */
    @PostMapping("/view-events")
    public ResponseEntity<Void> viewPage(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId,
                                         @PathVariable int pageNumber,
                                         @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        pages.recordView(userId(jwt), documentId, pageNumber, key);
        return ResponseEntity.noContent().build();
    }

    /** Args: authenticated JWT. Output: Student UUID. Errors: 401 INVALID_SESSION. */
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

    /** Input: required note content, including empty text to clear. Output: DTO only; errors: validation in service. */
    public record NoteRequest(String content) { }
}
