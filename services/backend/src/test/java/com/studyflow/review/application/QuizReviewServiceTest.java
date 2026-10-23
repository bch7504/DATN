package com.studyflow.review.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.review.domain.Quiz;
import com.studyflow.review.domain.QuizAnswer;
import com.studyflow.review.domain.QuizAnswerRepository;
import com.studyflow.review.domain.QuizAttempt;
import com.studyflow.review.domain.QuizAttemptRepository;
import com.studyflow.review.domain.QuizAttemptStatus;
import com.studyflow.review.domain.QuizCreatorRole;
import com.studyflow.review.domain.QuizGenerationType;
import com.studyflow.review.domain.QuizQuestion;
import com.studyflow.review.domain.QuizQuestionRepository;
import com.studyflow.review.domain.QuizQuestionSource;
import com.studyflow.review.domain.QuizQuestionSourceRepository;
import com.studyflow.review.domain.QuizRepository;
import com.studyflow.review.domain.QuizStatus;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuizReviewServiceTest {

    private static final UUID QUIZ_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID STUDENT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OFFERING_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID Q1_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID DOC_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private QuizQuestionRepository quizQuestionRepository;

    @Mock
    private QuizQuestionSourceRepository quizQuestionSourceRepository;

    @Mock
    private QuizAttemptRepository quizAttemptRepository;

    @Mock
    private QuizAnswerRepository quizAnswerRepository;

    @Mock
    private CourseEnrollmentRepository enrollmentRepository;

    private Clock fixedClock;
    private QuizReviewService service;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-10-22T08:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new QuizReviewService(
                quizRepository,
                quizQuestionRepository,
                quizQuestionSourceRepository,
                quizAttemptRepository,
                quizAnswerRepository,
                enrollmentRepository,
                fixedClock
        );
    }

    @Test
    @DisplayName("acceptQuiz with APPROVED course offering sets status to READY and updates courseOfferingId")
    void acceptQuizWithCourseOfferingSuccess() {
        Quiz quiz = new Quiz(
                QUIZ_ID, STUDENT_ID, QuizCreatorRole.STUDENT, null,
                "Lý thuyết CSDL", null, null,
                QuizGenerationType.PERSONAL_STUDENT, QuizStatus.REVIEW_REQUIRED,
                5, null, Instant.now(fixedClock), Instant.now(fixedClock)
        );
        CourseEnrollment enrollment = new CourseEnrollment(UUID.randomUUID(), OFFERING_ID, STUDENT_ID);
        enrollment.approve(UUID.randomUUID());

        when(quizRepository.findById(QUIZ_ID)).thenReturn(Optional.of(quiz));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID))
                .thenReturn(Optional.of(enrollment));

        service.acceptQuiz(QUIZ_ID, STUDENT_ID, OFFERING_ID);

        assertThat(quiz.getStatus()).isEqualTo(QuizStatus.READY);
        assertThat(quiz.getCourseOfferingId()).isEqualTo(OFFERING_ID);
        verify(quizRepository).save(quiz);
    }

    @Test
    @DisplayName("acceptQuiz throws 403 if target course offering is not APPROVED")
    void acceptQuizUnapprovedOfferingThrows() {
        Quiz quiz = new Quiz(
                QUIZ_ID, STUDENT_ID, QuizCreatorRole.STUDENT, null,
                "Lý thuyết CSDL", null, null,
                QuizGenerationType.PERSONAL_STUDENT, QuizStatus.REVIEW_REQUIRED,
                5, null, Instant.now(fixedClock), Instant.now(fixedClock)
        );
        when(quizRepository.findById(QUIZ_ID)).thenReturn(Optional.of(quiz));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.acceptQuiz(QUIZ_ID, STUDENT_ID, OFFERING_ID))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).code()).isEqualTo("FORBIDDEN_OFFERING"));
    }

    @Test
    @DisplayName("getWrongAnswerReviewItems aggregates citations from wrong answers")
    void getWrongAnswerReviewItemsSuccess() {
        Quiz quiz = new Quiz(
                QUIZ_ID, STUDENT_ID, QuizCreatorRole.STUDENT, OFFERING_ID,
                "Lý thuyết CSDL", null, null,
                QuizGenerationType.PERSONAL_STUDENT, QuizStatus.READY,
                1, null, Instant.now(fixedClock), Instant.now(fixedClock)
        );

        UUID attemptId = UUID.randomUUID();
        QuizAttempt attempt = new QuizAttempt(
                attemptId, QUIZ_ID, STUDENT_ID, QuizAttemptStatus.SCORED,
                BigDecimal.ZERO, 0, 1,
                Instant.now(fixedClock), Instant.now(fixedClock),
                Instant.now(fixedClock), Instant.now(fixedClock)
        );

        QuizAnswer wrongAnswer = QuizAnswer.of(
                UUID.randomUUID(), attemptId, Q1_ID, 1, false, BigDecimal.ZERO, Instant.now(fixedClock)
        );

        QuizQuestion q1 = new QuizQuestion(Q1_ID, QUIZ_ID, "Câu 1?", "A", "B", "C", "D", 0, "Giải thích 1", 1, Instant.now(fixedClock));
        QuizQuestionSource source = new QuizQuestionSource(UUID.randomUUID(), Q1_ID, DOC_ID, 8, "Trích dẫn trang 8", Instant.now(fixedClock));

        when(quizRepository.findByCourseOfferingIdAndStatusInOrderByCreatedAtDesc(eq(OFFERING_ID), any()))
                .thenReturn(List.of(quiz));
        when(quizAttemptRepository.findByQuizIdInAndStudentIdOrderByCreatedAtDesc(any(), eq(STUDENT_ID)))
                .thenReturn(List.of(attempt));
        when(quizAnswerRepository.findByAttemptIdAndIsCorrectFalse(attemptId))
                .thenReturn(List.of(wrongAnswer));
        when(quizQuestionRepository.findAllById(any()))
                .thenReturn(List.of(q1));
        when(quizQuestionSourceRepository.findByQuestionIdIn(any()))
                .thenReturn(List.of(source));

        List<WrongAnswerReviewItemDTO> reviewItems = service.getWrongAnswerReviewItems(OFFERING_ID, STUDENT_ID);

        assertThat(reviewItems).hasSize(1);
        WrongAnswerReviewItemDTO item = reviewItems.get(0);
        assertThat(item.questionId()).isEqualTo(Q1_ID);
        assertThat(item.correctOptionIndex()).isEqualTo(0);
        assertThat(item.studentSelectedOptionIndex()).isEqualTo(1);
        assertThat(item.citations()).hasSize(1);
        assertThat(item.citations().get(0).pageNumber()).isEqualTo(8);
        assertThat(item.citations().get(0).excerpt()).isEqualTo("Trích dẫn trang 8");
    }
}
