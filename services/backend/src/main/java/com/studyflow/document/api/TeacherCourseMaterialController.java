package com.studyflow.document.api;

import com.studyflow.document.application.CourseMaterialLibraryService;
import com.studyflow.document.domain.CourseMaterialDocument;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/** Public Java API for a Teacher's private Course Material PDF library. */
@RestController
@RequestMapping("/api/v1/teacher/documents")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherCourseMaterialController {
    private final CourseMaterialLibraryService service;

    public TeacherCourseMaterialController(CourseMaterialLibraryService service) { this.service = service; }

    /** Input: authenticated Teacher JWT and multipart PDF/title. Output: HTTP 201 safe metadata. Errors: 401/403/413/415/422/502/503. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TeacherDocumentResponse> upload(@AuthenticationPrincipal Jwt jwt,
            @RequestPart("file") MultipartFile file, @RequestParam("title") String title) {
        CourseMaterialDocument document = service.upload(userId(jwt), file, title);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.listTeacher(userId(jwt)).stream()
                .filter(item -> item.id().equals(document.getId())).findFirst().orElseThrow());
    }

    /** Input: authenticated Teacher JWT. Output: page-zero metadata list. Errors: 401/403. */
    @GetMapping
    public DocumentListResponse list(@AuthenticationPrincipal Jwt jwt) {
        List<TeacherDocumentResponse> items = service.listTeacher(userId(jwt));
        return new DocumentListResponse(items, 0, items.size(), items.size(), items.isEmpty() ? 0 : 1);
    }

    /** Input: authenticated Teacher JWT and document UUID. Output: authorized inline PDF stream. Errors: 401/403/404/503. */
    @GetMapping("/{documentId}/download")
    public ResponseEntity<StreamingResponseBody> download(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId) {
        CourseMaterialLibraryService.Download file = service.downloadForTeacher(userId(jwt), documentId);
        return stream(file);
    }

    /** Input: authenticated Teacher JWT and multipart publication selection. Output: HTTP 204. Errors: 401/403/404/409/422. */
    @PostMapping("/{documentId}/publications")
    public ResponseEntity<Void> publish(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId,
            @org.springframework.web.bind.annotation.RequestBody @jakarta.validation.Valid PublishDocumentsRequest request) {
        service.setPublications(userId(jwt), documentId, request.courseOfferingIds());
        return ResponseEntity.noContent().build();
    }

    /** Input: authenticated Teacher JWT, document UUID and offering UUID. Output: HTTP 204. Errors: 401/403/404. */
    @DeleteMapping("/{documentId}/publications")
    public ResponseEntity<Void> revoke(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId,
            @RequestParam UUID offeringId) {
        service.revokePublication(userId(jwt), documentId, offeringId);
        return ResponseEntity.noContent().build();
    }

    private static ResponseEntity<StreamingResponseBody> stream(CourseMaterialLibraryService.Download file) {
        StreamingResponseBody body = output -> {
            try (InputStream input = file.content()) { input.transferTo(output); }
        };
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(file.contentType()));
        headers.setContentLength(file.sizeBytes());
        headers.setContentDisposition(ContentDisposition.inline().filename(file.fileName(), StandardCharsets.UTF_8).build());
        headers.set("X-Content-Type-Options", "nosniff");
        return new ResponseEntity<>(body, headers, HttpStatus.OK);
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) throw new com.studyflow.common.exception.ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException exception) { throw new com.studyflow.common.exception.ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ."); }
    }
}
