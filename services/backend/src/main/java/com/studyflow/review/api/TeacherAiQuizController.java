package com.studyflow.review.api;

import com.studyflow.common.api.RequestIdFilter;
import com.studyflow.review.application.AiQuizService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Teacher-only AI Quiz generator over owned READY Course Material PDFs. */
@RestController
@RequestMapping("/api/v1/teacher/quizzes")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherAiQuizController {
    private final AiQuizService service;

    /** Args: Quiz service. Input: Spring dependency. Output: controller. Errors: none. */
    public TeacherAiQuizController(AiQuizService service) { this.service = service; }

    /** Input: owned class/PDF scope and explicit controls. Output: REVIEW_REQUIRED draft. Errors: 401/403/404/409/422/502/503. */
    @PostMapping("/generations")
    public QuizApiModels.Draft generate(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody QuizApiModels.TeacherGenerateRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestAttribute(name = RequestIdFilter.ATTRIBUTE) String requestId
    ) {
        return service.createTeacher(StudentQuizGenerationController.userId(jwt), request, requestId,
                StudentQuizGenerationController.idempotencyKey(idempotencyKey));
    }

    /** Input: Teacher-owned REVIEW_REQUIRED draft. Output: PUBLISHED draft. Errors: 403/404/409. */
    @PostMapping("/{quizId}/publish")
    public QuizApiModels.Draft publish(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID quizId
    ) {
        return service.publishTeacher(StudentQuizGenerationController.userId(jwt), quizId);
    }
}
