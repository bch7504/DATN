package com.studyflow.assignment.api;

import com.studyflow.assignment.application.AssignmentService;
import com.studyflow.assignment.domain.CourseAssignment;
import com.studyflow.common.exception.ApiException;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherAssignmentController {
    private final AssignmentService service;

    public TeacherAssignmentController(AssignmentService service) { this.service = service; }

    /** Input: authenticated Teacher, offering UUID and validated draft DTO. Output: HTTP 201 assignment. Errors: 401/403/404/409/422. */
    @PostMapping("/course-offerings/{offeringId}/assignments")
    public ResponseEntity<AssignmentResponses.Assignment> create(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID offeringId,
            @Valid @RequestBody AssignmentRequests.CreateDraft input) {
        CourseAssignment created = service.createDraft(userId(jwt), offeringId, input);
        return ResponseEntity.status(HttpStatus.CREATED).body(AssignmentResponses.Assignment.from(created, null));
    }

    /** Input: authenticated Teacher, assignment UUID and complete replacement fields. Output: HTTP 200 updated draft. Errors: 401/403/404/409/422. */
    @PutMapping("/assignments/{assignmentId}")
    public ResponseEntity<AssignmentResponses.Assignment> update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID assignmentId,
            @Valid @RequestBody AssignmentRequests.UpdateDraft input) {
        return ResponseEntity.ok(AssignmentResponses.Assignment.from(
                service.updateDraft(userId(jwt), assignmentId, input), null));
    }

    /** Input: authenticated Teacher and draft UUID. Output: HTTP 200 published assignment. Errors: 401/403/404/409. */
    @PostMapping("/assignments/{assignmentId}/publish")
    public ResponseEntity<AssignmentResponses.Assignment> publish(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID assignmentId) {
        return ResponseEntity.ok(AssignmentResponses.Assignment.from(service.publish(userId(jwt), assignmentId), null));
    }

    /** Input: authenticated Teacher and owned course UUID. Output: HTTP 200 class assignment list. Errors: 401/403/404. */
    @GetMapping("/course-offerings/{offeringId}/assignments")
    public ResponseEntity<List<AssignmentResponses.Assignment>> list(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID offeringId) {
        return ResponseEntity.ok(service.listTeacher(userId(jwt), offeringId).stream()
                .map(item -> AssignmentResponses.Assignment.from(item, null)).toList());
    }

    /** Input: authenticated Teacher and assignment UUID. Output: HTTP 200 approved-student submission report. Errors: 401/403/404. */
    @GetMapping("/assignments/{assignmentId}/submissions")
    public ResponseEntity<AssignmentResponses.AssignmentStats> stats(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID assignmentId) {
        return ResponseEntity.ok(service.stats(userId(jwt), assignmentId));
    }

    /** Input: owning Teacher JWT and assignment/student/attachment UUIDs. Output: streamed attachment with safe download headers. Errors: 401/403/404/503. */
    @GetMapping("/assignments/{assignmentId}/submissions/{studentId}/attachments/{attachmentId}/download")
    public ResponseEntity<StreamingResponseBody> downloadAttachment(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID assignmentId,
            @PathVariable UUID studentId, @PathVariable UUID attachmentId) {
        AssignmentService.AttachmentDownload file = service.downloadForTeacher(
                userId(jwt), assignmentId, studentId, attachmentId);
        StreamingResponseBody body = output -> {
            try (InputStream input = file.content()) { input.transferTo(output); }
        };
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(file.contentType()));
        headers.setContentLength(file.sizeBytes());
        headers.setContentDisposition(ContentDisposition.attachment().filename(file.fileName(), StandardCharsets.UTF_8).build());
        headers.set("X-Content-Type-Options", "nosniff");
        return new ResponseEntity<>(body, headers, HttpStatus.OK);
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        }
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        }
    }
}
