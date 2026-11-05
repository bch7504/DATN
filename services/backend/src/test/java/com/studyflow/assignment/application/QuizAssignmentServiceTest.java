package com.studyflow.assignment.application;

import com.studyflow.assignment.api.AssignmentRequests;
import com.studyflow.assignment.domain.AssignmentStatus;
import com.studyflow.assignment.domain.AssignmentSubmission;
import com.studyflow.assignment.domain.AssignmentSubmissionRepository;
import com.studyflow.assignment.domain.AssignmentType;
import com.studyflow.assignment.domain.CourseAssignment;
import com.studyflow.assignment.domain.CourseAssignmentRepository;
import com.studyflow.common.exception.ConflictException;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.review.application.QuizAttemptService;
import com.studyflow.review.application.StartQuizAttemptResult;
import com.studyflow.review.application.SubmitQuizAttemptResult;
import com.studyflow.review.domain.QuizAttempt;
import com.studyflow.review.domain.QuizAttemptRepository;
import com.studyflow.review.domain.QuizAttemptStatus;
import com.studyflow.review.domain.QuizAnswerRepository;
import com.studyflow.review.domain.QuizAnswer;
import com.studyflow.review.domain.QuizQuestion;
import com.studyflow.review.domain.QuizQuestionRepository;
import com.studyflow.review.domain.QuizRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class QuizAssignmentServiceTest {
    private static final UUID ASSIGNMENT_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID OFFERING_ID = UUID.fromString("10000000-0000-0000-0000-000000000002");
    private static final UUID QUIZ_ID = UUID.fromString("10000000-0000-0000-0000-000000000003");
    private static final UUID STUDENT_ID = UUID.fromString("10000000-0000-0000-0000-000000000004");
    private static final UUID ATTEMPT_ID = UUID.fromString("10000000-0000-0000-0000-000000000005");
    private static final UUID TEACHER_ID = UUID.fromString("10000000-0000-0000-0000-000000000006");

    @Mock CourseAssignmentRepository assignments;
    @Mock AssignmentSubmissionRepository submissions;
    @Mock CourseOfferingRepository offerings;
    @Mock CourseEnrollmentRepository enrollments;
    @Mock QuizRepository quizzes;
    @Mock QuizAttemptRepository quizAttempts;
    @Mock QuizAnswerRepository quizAnswers;
    @Mock QuizQuestionRepository quizQuestions;
    @Mock QuizAttemptService attempts;

    private QuizAssignmentService service;

    @BeforeEach
    void setUp() {
        service = new QuizAssignmentService(assignments, submissions, offerings, enrollments, quizzes,
                quizAttempts, quizAnswers, quizQuestions, attempts,
                Clock.fixed(Instant.parse("2026-11-03T08:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void startReturnsQuestionsOnlyAfterAssignmentAndEnrollmentValidation() {
        CourseAssignment assignment = assignment();
        CourseEnrollment enrollment = org.mockito.Mockito.mock(CourseEnrollment.class);
        StartQuizAttemptResult expected = new StartQuizAttemptResult(ATTEMPT_ID, QUIZ_ID, "Quiz lớp", Instant.now(), 0, List.of());
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(assignment));
        when(enrollments.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID)).thenReturn(Optional.of(enrollment));
        when(enrollment.getStatus()).thenReturn(EnrollmentStatus.APPROVED);
        when(attempts.startAssignmentAttempt(QUIZ_ID, STUDENT_ID)).thenReturn(expected);

        assertThat(service.start(STUDENT_ID, ASSIGNMENT_ID)).isSameAs(expected);
    }

    @Test
    void submitScoresExistingAttemptAndLinksSubmission() {
        CourseAssignment assignment = assignment();
        CourseEnrollment enrollment = org.mockito.Mockito.mock(CourseEnrollment.class);
        QuizAttempt attempt = org.mockito.Mockito.mock(QuizAttempt.class);
        SubmitQuizAttemptResult result = new SubmitQuizAttemptResult(ATTEMPT_ID, QUIZ_ID,
                new BigDecimal("75.00"), 3, 4, Instant.now(), List.of());
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(assignment));
        when(enrollments.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID)).thenReturn(Optional.of(enrollment));
        when(enrollment.getStatus()).thenReturn(EnrollmentStatus.APPROVED);
        when(quizAttempts.findById(ATTEMPT_ID)).thenReturn(Optional.of(attempt));
        when(attempt.getStudentId()).thenReturn(STUDENT_ID);
        when(attempt.getQuizId()).thenReturn(QUIZ_ID);
        when(attempt.getStatus()).thenReturn(QuizAttemptStatus.IN_PROGRESS);
        when(attempts.submitAttempt(any())).thenReturn(result);
        when(submissions.findByAssignmentIdAndStudentId(ASSIGNMENT_ID, STUDENT_ID)).thenReturn(Optional.empty());

        SubmitQuizAttemptResult actual = service.submit(STUDENT_ID, ASSIGNMENT_ID,
                new AssignmentRequests.SubmitQuiz(ATTEMPT_ID, Map.of()));

        assertThat(actual.score()).isEqualByComparingTo("75.00");
        ArgumentCaptor<AssignmentSubmission> saved = ArgumentCaptor.forClass(AssignmentSubmission.class);
        verify(submissions).save(saved.capture());
        assertThat(saved.getValue().getQuizAttemptId()).isEqualTo(ATTEMPT_ID);
        assertThat(saved.getValue().getScore()).isEqualByComparingTo("75.00");
    }

    @Test
    void submitRejectsAttemptFromAnotherQuiz() {
        CourseAssignment assignment = assignment();
        CourseEnrollment enrollment = org.mockito.Mockito.mock(CourseEnrollment.class);
        QuizAttempt attempt = org.mockito.Mockito.mock(QuizAttempt.class);
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(assignment));
        when(enrollments.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID)).thenReturn(Optional.of(enrollment));
        when(enrollment.getStatus()).thenReturn(EnrollmentStatus.APPROVED);
        when(quizAttempts.findById(ATTEMPT_ID)).thenReturn(Optional.of(attempt));
        when(attempt.getStudentId()).thenReturn(STUDENT_ID);
        when(attempt.getQuizId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> service.submit(STUDENT_ID, ASSIGNMENT_ID,
                new AssignmentRequests.SubmitQuiz(ATTEMPT_ID, Map.of())))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void retryOfSameScoredAttemptReturnsPersistedResultWithoutScoringAgain() {
        CourseAssignment assignment = assignment();
        CourseEnrollment enrollment = org.mockito.Mockito.mock(CourseEnrollment.class);
        QuizAttempt attempt = org.mockito.Mockito.mock(QuizAttempt.class);
        AssignmentSubmission submission = org.mockito.Mockito.mock(AssignmentSubmission.class);
        SubmitQuizAttemptResult expected = new SubmitQuizAttemptResult(ATTEMPT_ID, QUIZ_ID,
                new BigDecimal("50.00"), 2, 4, Instant.now(), List.of());
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(assignment));
        when(enrollments.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID)).thenReturn(Optional.of(enrollment));
        when(enrollment.getStatus()).thenReturn(EnrollmentStatus.APPROVED);
        when(quizAttempts.findById(ATTEMPT_ID)).thenReturn(Optional.of(attempt));
        when(attempt.getStudentId()).thenReturn(STUDENT_ID);
        when(attempt.getQuizId()).thenReturn(QUIZ_ID);
        when(attempt.getStatus()).thenReturn(QuizAttemptStatus.SCORED);
        when(submissions.findByAssignmentIdAndStudentId(ASSIGNMENT_ID, STUDENT_ID)).thenReturn(Optional.of(submission));
        when(submission.getQuizAttemptId()).thenReturn(ATTEMPT_ID);
        when(attempts.getScoredAttempt(ATTEMPT_ID, STUDENT_ID)).thenReturn(expected);

        SubmitQuizAttemptResult actual = service.submit(STUDENT_ID, ASSIGNMENT_ID,
                new AssignmentRequests.SubmitQuiz(ATTEMPT_ID, Map.of()));

        assertThat(actual).isSameAs(expected);
    }

    @Test
    void questionAnalyticsUsesOnlyCurrentAssignmentAttempts() {
        CourseAssignment assignment = assignment();
        UUID secondAttemptId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        AssignmentSubmission first = org.mockito.Mockito.mock(AssignmentSubmission.class);
        AssignmentSubmission second = org.mockito.Mockito.mock(AssignmentSubmission.class);
        QuizQuestion question = new QuizQuestion(questionId, QUIZ_ID, "Câu hỏi", "A", "B", "C", "D",
                0, "Giải thích", 1, Instant.now());
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(assignment));
        when(assignment.getTeacherId()).thenReturn(TEACHER_ID);
        when(submissions.findByAssignmentId(ASSIGNMENT_ID)).thenReturn(List.of(first, second));
        when(first.getQuizAttemptId()).thenReturn(ATTEMPT_ID);
        when(second.getQuizAttemptId()).thenReturn(secondAttemptId);
        when(quizQuestions.findByQuizIdOrderByQuestionOrderAsc(QUIZ_ID)).thenReturn(List.of(question));
        when(quizAnswers.findByAttemptIdIn(List.of(ATTEMPT_ID, secondAttemptId))).thenReturn(List.of(
                QuizAnswer.of(UUID.randomUUID(), ATTEMPT_ID, questionId, 0, true, BigDecimal.ONE, Instant.now()),
                QuizAnswer.of(UUID.randomUUID(), secondAttemptId, questionId, 1, false, BigDecimal.ZERO, Instant.now())
        ));

        var analytics = service.questionAnalytics(TEACHER_ID, ASSIGNMENT_ID);

        assertThat(analytics).singleElement().satisfies(item -> {
            assertThat(item.submissionCount()).isEqualTo(2);
            assertThat(item.wrongCount()).isEqualTo(1);
            assertThat(item.wrongRatePercent()).isEqualTo(50.0);
        });
    }

    private static CourseAssignment assignment() {
        CourseAssignment assignment = org.mockito.Mockito.mock(CourseAssignment.class);
        lenient().when(assignment.getStatus()).thenReturn(AssignmentStatus.PUBLISHED);
        lenient().when(assignment.getType()).thenReturn(AssignmentType.QUIZ);
        lenient().when(assignment.getQuizId()).thenReturn(QUIZ_ID);
        lenient().when(assignment.getCourseOfferingId()).thenReturn(OFFERING_ID);
        lenient().when(assignment.getDueAt()).thenReturn(Instant.parse("2026-11-10T08:00:00Z"));
        lenient().when(assignment.getTeacherId()).thenReturn(TEACHER_ID);
        return assignment;
    }
}
