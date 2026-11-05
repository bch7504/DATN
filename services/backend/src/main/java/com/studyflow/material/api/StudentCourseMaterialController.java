package com.studyflow.material.api;

import com.studyflow.document.api.DocumentListResponse;
import com.studyflow.document.api.TeacherDocumentResponse;
import com.studyflow.document.application.CourseMaterialLibraryService;
import com.studyflow.note.api.PageNoteResponse;
import com.studyflow.note.api.SavePageNoteRequest;
import com.studyflow.note.application.CourseMaterialPageNoteService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/** Public Java API for Course Material visible to the authenticated Student. */
@RestController
@RequestMapping("/api/v1/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentCourseMaterialController {
    private final CourseMaterialLibraryService service;
    private final CourseMaterialPageNoteService notes;

    public StudentCourseMaterialController(CourseMaterialLibraryService service,
                                           CourseMaterialPageNoteService notes) {
        this.service = service;
        this.notes = notes;
    }

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

    /** Input: authenticated Student JWT and REFERENCE_PDF UUID. Output: authorized attachment stream. Errors: 401/403/404/409/503. */
    @GetMapping("/materials/{documentId}/download")
    public ResponseEntity<StreamingResponseBody> download(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId) {
        CourseMaterialLibraryService.Download file = service.downloadForStudent(userId(jwt), documentId);
        StreamingResponseBody body = output -> {
            try (InputStream input = file.content()) { input.transferTo(output); }
        };
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(file.contentType()));
        headers.setContentLength(file.sizeBytes());
        ContentDisposition.Builder disposition = ContentDisposition.attachment();
        headers.setContentDisposition(disposition.filename(file.fileName(), StandardCharsets.UTF_8).build());
        headers.set("X-Content-Type-Options", "nosniff");
        return new ResponseEntity<>(body, headers, HttpStatus.OK);
    }

    /**
     * Args: authenticated Student JWT, SLIDE_PDF UUID and required 1-based page number.
     * Input: an authorized READY slide publication. Output: PNG bytes for exactly one slide with
     * X-Total-Slides metadata. Errors: 401/403/404/409/422/502/503.
     */
    @GetMapping(value = "/materials/{documentId}/slides/{pageNumber}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> slide(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId,
                                        @PathVariable int pageNumber) {
        CourseMaterialLibraryService.SlideImage image = service.renderStudentSlide(
                userId(jwt), documentId, pageNumber);
        byte[] content = image.content();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setContentLength(content.length);
        headers.setCacheControl("private, no-store, max-age=0");
        headers.set("Pragma", "no-cache");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Total-Slides", Integer.toString(image.totalSlides()));
        headers.setContentDisposition(ContentDisposition.inline()
                .filename("slide-" + image.pageNumber() + ".png", StandardCharsets.UTF_8).build());
        return new ResponseEntity<>(content, headers, HttpStatus.OK);
    }

    /**
     * Args: authenticated Student JWT, SLIDE_PDF UUID and 1-based page number.
     * Output: positioned text runs for browser selection; never returns the source PDF.
     * Errors: 401/403/404/409/422/502/503.
     */
    @GetMapping("/materials/{documentId}/slides/{pageNumber}/text-layer")
    public CourseMaterialLibraryService.SlideTextLayer slideText(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID documentId,
            @PathVariable int pageNumber) {
        return service.extractStudentSlideText(userId(jwt), documentId, pageNumber);
    }

    /** Input: authorized Student and slide page. Output: own note or an empty note. Errors: 401/403/404/409/422. */
    @GetMapping("/materials/{documentId}/pages/{pageNumber}/note")
    public PageNoteResponse getNote(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId,
                                    @PathVariable int pageNumber) {
        return notes.get(userId(jwt), documentId, pageNumber);
    }

    /** Input: authorized Student, slide page and content up to 5,000 chars. Output: saved own note. Errors: 401/403/404/409/422. */
    @PutMapping("/materials/{documentId}/pages/{pageNumber}/note")
    public PageNoteResponse saveNote(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID documentId,
                                     @PathVariable int pageNumber,
                                     @Valid @RequestBody SavePageNoteRequest request) {
        return notes.save(userId(jwt), documentId, pageNumber, request.content());
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) throw new com.studyflow.common.exception.ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException exception) { throw new com.studyflow.common.exception.ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ."); }
    }
}
