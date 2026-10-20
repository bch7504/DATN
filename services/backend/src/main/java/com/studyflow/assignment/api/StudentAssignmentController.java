package com.studyflow.assignment.api;

import com.studyflow.assignment.application.AssignmentService;
import com.studyflow.assignment.domain.AssignmentSubmission;
import com.studyflow.common.exception.ApiException;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ContentDisposition;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/student/assignments")
@PreAuthorize("hasRole('STUDENT')")
public class StudentAssignmentController {
    private final AssignmentService service;

    public StudentAssignmentController(AssignmentService service) { this.service = service; }

    /** Input: authenticated Student. Output: HTTP 200 assignments in approved classes with own submission state. Errors: 401/403. */
    @GetMapping
    public ResponseEntity<List<AssignmentResponses.Assignment>> list(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.listStudent(userId(jwt)));
    }

    /** Input: authenticated, approved Student; assignment UUID and answer text. Output: HTTP 200 stored latest submission. Errors: 401/403/404/409/422. */
    @PostMapping("/{assignmentId}/submissions")
    public ResponseEntity<AssignmentResponses.Submission> submit(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID assignmentId,
            @Valid @RequestBody AssignmentRequests.SubmitAnswer input) {
        AssignmentSubmission submitted = service.submit(userId(jwt), assignmentId, input);
        return ResponseEntity.ok(AssignmentResponses.Submission.from(submitted, service.listAttachments(submitted.getId())));
    }

    /** Input: Student JWT, assignment UUID, optional answerText and up to five multipart files. Output: 200 submission with safe attachment metadata. Errors: 401/403/404/409/422/502/503. */
    @PostMapping(value = "/{assignmentId}/submissions/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssignmentResponses.Submission> submitWithAttachments(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID assignmentId,
            @RequestPart(value = "answerText", required = false) String answerText,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        AssignmentSubmission submitted = service.submitAttachments(userId(jwt), assignmentId, answerText, files);
        return ResponseEntity.ok(AssignmentResponses.Submission.from(submitted, service.listAttachments(submitted.getId())));
    }

    /** Input: approved Student JWT and owned attachment path identifiers. Output: streamed file with attachment disposition. Errors: 401/403/404/503. */
    @GetMapping("/{assignmentId}/submissions/attachments/{attachmentId}/download")
    public ResponseEntity<StreamingResponseBody> downloadAttachment(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID assignmentId, @PathVariable UUID attachmentId) {
        AssignmentService.AttachmentDownload file = service.downloadForStudent(userId(jwt), assignmentId, attachmentId);
        return download(file);
    }

    private static ResponseEntity<StreamingResponseBody> download(AssignmentService.AttachmentDownload file) {
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
