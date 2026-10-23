package com.studyflow.review.api;

import com.studyflow.common.api.RequestIdFilter;
import com.studyflow.review.application.AiQuizService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Owner-only Java lifecycle for reviewing, regenerating, accepting or rejecting an AI Quiz. */
@RestController
@RequestMapping("/api/v1/review/quizzes")
@PreAuthorize("hasAnyRole('STUDENT','TEACHER')")
public class QuizReviewController {
    private final AiQuizService service;

    /** Args: Quiz service. Input: Spring dependency. Output: controller. Errors: none. */
    public QuizReviewController(AiQuizService service) { this.service = service; }

    /** Input: authenticated owner and quiz ID. Output: current review draft. Errors: 401/403/404. */
    @GetMapping("/{quizId}")
    public QuizApiModels.Draft get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID quizId) {
        return service.get(StudentQuizGenerationController.userId(jwt), quizId);
    }

    /** Input: owner draft, replacement prompt and idempotency key. Output: NEW draft. Errors: 404/409/422/502/503. */
    @PostMapping("/{quizId}/regenerate")
    public QuizApiModels.Draft regenerate(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID quizId,
            @Valid @RequestBody QuizApiModels.RegenerateRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestAttribute(name = RequestIdFilter.ATTRIBUTE) String requestId
    ) {
        return service.regenerate(StudentQuizGenerationController.userId(jwt), quizId, request.prompt(), requestId,
                StudentQuizGenerationController.idempotencyKey(idempotencyKey));
    }

    /** Input: Student owner and destination. Output: READY Quiz. Errors: 404/409/422. */
    @PostMapping("/{quizId}/accept")
    @PreAuthorize("hasRole('STUDENT')")
    public QuizApiModels.AcceptedQuiz accept(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID quizId,
            @Valid @RequestBody QuizApiModels.AcceptRequest request
    ) {
        return service.accept(StudentQuizGenerationController.userId(jwt), quizId,
                request.destinationType(), request.courseOfferingId());
    }

    /** Input: authenticated owner and REVIEW_REQUIRED draft. Output: HTTP 204. Errors: 404/409. */
    @PostMapping("/{quizId}/reject")
    public ResponseEntity<Void> reject(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID quizId) {
        service.reject(StudentQuizGenerationController.userId(jwt), quizId);
        return ResponseEntity.noContent().build();
    }
}
