package com.studyflow.document.api;

import com.studyflow.common.api.RequestIdFilter;
import com.studyflow.common.exception.ApiException;
import com.studyflow.document.application.PersonalDocumentService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Public Java API for the authenticated Student's Personal PDF library. */
@RestController
@RequestMapping("/api/v1/personal-documents")
@PreAuthorize("hasRole('STUDENT')")
public class PersonalDocumentController {
    private final PersonalDocumentService service;

    /** Args: Personal PDF service. Input: Spring dependency. Output: controller. Errors: none. */
    public PersonalDocumentController(PersonalDocumentService service) { this.service = service; }

    /** Input: authenticated Student and multipart text-layer PDF. Output: HTTP 201 metadata. Errors: 401/403/409/413/415/422/502/503. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PersonalDocumentResponse> upload(
            @AuthenticationPrincipal Jwt jwt,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.upload(userId(jwt), file));
    }

    /** Input: authenticated Student. Output: page-zero newest-first owner list. Errors: 401/403. */
    @GetMapping
    public PersonalDocumentListResponse list(@AuthenticationPrincipal Jwt jwt) {
        List<PersonalDocumentResponse> items = service.list(userId(jwt));
        return new PersonalDocumentListResponse(items, 0, items.size(), items.size(), items.isEmpty() ? 0 : 1);
    }

    /** Input: authenticated owner and document UUID. Output: current processing metadata. Errors: 401/403/404. */
    @GetMapping("/{documentId}/status")
    public PersonalDocumentResponse status(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId) {
        return service.status(userId(jwt), documentId);
    }

    /** Input: authenticated owner, document UUID and request ID. Output: HTTP 204. Errors: 401/403/404/502/503. */
    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID documentId,
            @RequestAttribute(name = RequestIdFilter.ATTRIBUTE) String requestId
    ) {
        service.delete(userId(jwt), documentId, requestId);
        return ResponseEntity.noContent().build();
    }

    /** Args: authenticated JWT. Input: UUID subject. Output: actor UUID. Errors: 401 for missing/malformed subject. */
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
