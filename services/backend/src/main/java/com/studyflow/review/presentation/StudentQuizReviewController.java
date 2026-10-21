package com.studyflow.review.presentation;

import com.studyflow.common.exception.ApiException;
import com.studyflow.review.application.QuizAttemptService;
import com.studyflow.review.application.QuizReviewService;
import com.studyflow.review.application.QuizSummaryDTO;
import com.studyflow.review.application.StartQuizAttemptResult;
import com.studyflow.review.application.SubmitQuizAttemptCommand;
import com.studyflow.review.application.SubmitQuizAttemptResult;
import com.studyflow.review.application.WrongAnswerReviewItemDTO;
import com.studyflow.review.dto.AcceptQuizRequest;
import com.studyflow.review.dto.AcceptQuizResponse;
import com.studyflow.review.dto.CourseOfferingReviewOverviewResponse;
import com.studyflow.review.dto.CourseOfferingReviewSummaryDTO;
import com.studyflow.review.dto.RejectQuizRequest;
import com.studyflow.review.dto.RejectQuizResponse;
import com.studyflow.review.dto.SubmitQuizAttemptRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for Student Quiz review, attempt scoring, and citation aggregate.
 */
@RestController
@RequestMapping("/api/v1/review")
@PreAuthorize("hasRole('STUDENT')")
public class StudentQuizReviewController {

    private final QuizReviewService quizReviewService;
    private final QuizAttemptService quizAttemptService;

    public StudentQuizReviewController(QuizReviewService quizReviewService, QuizAttemptService quizAttemptService) {
        this.quizReviewService = quizReviewService;
        this.quizAttemptService = quizAttemptService;
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
        }
    }

    /**
     * Accepts a generated Quiz into student's personal review space or links to an approved Course Offering.
     */
    @PostMapping("/quizzes/{id}/accept")
    public ResponseEntity<AcceptQuizResponse> acceptQuiz(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID quizId,
            @Valid @RequestBody AcceptQuizRequest request
    ) {
        UUID studentId = userId(jwt);
        UUID targetOfferingId = "COURSE_OFFERING".equalsIgnoreCase(request.destinationType())
                ? request.courseOfferingId()
                : null;
        if ("COURSE_OFFERING".equalsIgnoreCase(request.destinationType()) && targetOfferingId == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DESTINATION", "Mã lớp học phần là bắt buộc");
        }

        quizReviewService.acceptQuiz(quizId, studentId, targetOfferingId);
        return ResponseEntity.ok(new AcceptQuizResponse(quizId, "READY", targetOfferingId));
    }

    /**
     * Rejects a generated Quiz without starting an attempt.
     */
    @PostMapping("/quizzes/{id}/reject")
    public ResponseEntity<RejectQuizResponse> rejectQuiz(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID quizId,
            @RequestBody(required = false) RejectQuizRequest request
    ) {
        UUID studentId = userId(jwt);
        quizReviewService.rejectQuiz(quizId, studentId);
        return ResponseEntity.ok(new RejectQuizResponse(quizId, "REJECTED"));
    }

    /**
     * Starts a new attempt for a READY or PUBLISHED quiz. Questions are returned without answer keys.
     */
    @PostMapping("/quizzes/{id}/attempts")
    public ResponseEntity<StartQuizAttemptResult> startAttempt(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID quizId
    ) {
        UUID studentId = userId(jwt);
        StartQuizAttemptResult result = quizAttemptService.startAttempt(quizId, studentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * Submits student answers, calculates score, records QUIZ_COMPLETED event, and returns answers with citations.
     */
    @PostMapping("/attempts/{id}/submit")
    public ResponseEntity<SubmitQuizAttemptResult> submitAttempt(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID attemptId,
            @Valid @RequestBody SubmitQuizAttemptRequest request
    ) {
        UUID studentId = userId(jwt);
        SubmitQuizAttemptCommand command = new SubmitQuizAttemptCommand(
                attemptId,
                studentId,
                request.answers() != null ? request.answers() : Map.of()
        );
        SubmitQuizAttemptResult result = quizAttemptService.submitAttempt(command);
        return ResponseEntity.ok(result);
    }

    /**
     * Returns Course Offering review overview: available quizzes and wrong-answer review items with citations.
     */
    @GetMapping("/course-offerings/{id}")
    public ResponseEntity<CourseOfferingReviewOverviewResponse> getCourseOfferingReview(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID courseOfferingId
    ) {
        UUID studentId = userId(jwt);
        List<QuizSummaryDTO> quizzes = quizReviewService.getCourseQuizzes(courseOfferingId, studentId);
        List<WrongAnswerReviewItemDTO> reviewItems = quizReviewService.getWrongAnswerReviewItems(courseOfferingId, studentId);
        return ResponseEntity.ok(new CourseOfferingReviewOverviewResponse(courseOfferingId, quizzes, reviewItems));
    }

    /**
     * Returns list of Student's personal quizzes (courseOfferingId == null).
     */
    @GetMapping("/personal-quizzes")
    public ResponseEntity<List<QuizSummaryDTO>> getPersonalQuizzes(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID studentId = userId(jwt);
        List<QuizSummaryDTO> quizzes = quizReviewService.getPersonalQuizzes(studentId);
        return ResponseEntity.ok(quizzes);
    }

    /**
     * Returns enrolled Course Offerings review summary for review dashboard.
     */
    @GetMapping("/course-offerings")
    public ResponseEntity<List<CourseOfferingReviewSummaryDTO>> getCourseOfferingsReview(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID studentId = userId(jwt);
        List<CourseOfferingReviewSummaryDTO> summaries = quizReviewService.getEnrolledCourseOfferingsReview(studentId);
        return ResponseEntity.ok(summaries);
    }
}
