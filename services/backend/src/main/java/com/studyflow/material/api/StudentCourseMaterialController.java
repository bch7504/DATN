package com.studyflow.material.api;

import com.studyflow.document.api.DocumentListResponse;
import com.studyflow.document.api.TeacherDocumentResponse;
import com.studyflow.document.application.CourseMaterialLibraryService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/** Public Java API for Course Material visible to the authenticated Student. */
@RestController
@RequestMapping("/api/v1/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentCourseMaterialController {
    private final CourseMaterialLibraryService service;

    public StudentCourseMaterialController(CourseMaterialLibraryService service) { this.service = service; }

    /** Input: authenticated Student JWT. Output: page-zero list from approved classes. Errors: 401/403. */
    @GetMapping("/materials")
    public DocumentListResponse list(@AuthenticationPrincipal Jwt jwt) {
        List<TeacherDocumentResponse> items = service.listStudent(userId(jwt), null);
        return new DocumentListResponse(items, 0, items.size(), items.size(), items.isEmpty() ? 0 : 1);
    }

    /** Input: authenticated Student JWT and class UUID. Output: published PDF list. Errors: 401/403/404. */
    @GetMapping("/course-offerings/{offeringId}/materials")
    public DocumentListResponse listForOffering(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID offeringId) {
        List<TeacherDocumentResponse> items = service.listStudent(userId(jwt), offeringId);
        return new DocumentListResponse(items, 0, items.size(), items.size(), items.isEmpty() ? 0 : 1);
    }

    /** Input: authenticated Student JWT and document UUID. Output: authorized inline PDF stream. Errors: 401/403/404/503. */
    @GetMapping("/materials/{documentId}/download")
    public ResponseEntity<StreamingResponseBody> download(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId,
            @RequestParam(defaultValue = "false") boolean download) {
        CourseMaterialLibraryService.Download file = service.downloadForStudent(userId(jwt), documentId);
        StreamingResponseBody body = output -> {
            try (InputStream input = file.content()) { input.transferTo(output); }
        };
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(file.contentType()));
        headers.setContentLength(file.sizeBytes());
        ContentDisposition.Builder disposition = download ? ContentDisposition.attachment() : ContentDisposition.inline();
        headers.setContentDisposition(disposition.filename(file.fileName(), StandardCharsets.UTF_8).build());
        headers.set("X-Content-Type-Options", "nosniff");
        return new ResponseEntity<>(body, headers, HttpStatus.OK);
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) throw new com.studyflow.common.exception.ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException exception) { throw new com.studyflow.common.exception.ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ."); }
    }
}
