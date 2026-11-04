package com.studyflow.review.api;

import com.studyflow.review.application.QuizImageAccessService;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/** Authenticated delivery of private Quiz PNG artifacts; object keys are never exposed. */
@RestController
@RequestMapping("/api/v1/quiz-images")
@PreAuthorize("hasAnyRole('STUDENT','TEACHER')")
public class QuizImageController {
    private final QuizImageAccessService service;

    /** Args: image access service. Input: Spring dependency. Output: controller. Errors: none. */
    public QuizImageController(QuizImageAccessService service) {
        this.service = service;
    }

    /**
     * Args: authenticated actor and opaque image ID. Input: owner/enrollment-authorized image.
     * Output: inline image/png stream. Errors: 401/403/404/503; stream IO aborts the response.
     */
    @GetMapping("/{imageId}")
    public ResponseEntity<StreamingResponseBody> get(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID imageId
    ) {
        QuizImageAccessService.Download download = service.get(StudentQuizGenerationController.userId(jwt), imageId);
        StreamingResponseBody body = output -> {
            try (var input = download.stream()) {
                input.transferTo(output);
            } catch (IOException exception) {
                throw exception;
            }
        };
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(body);
    }
}
