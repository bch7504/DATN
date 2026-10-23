package com.studyflow.review.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.progress.application.LearningEventService;
import com.studyflow.progress.application.RecordLearningEventCommand;
import com.studyflow.progress.domain.EventType;
import com.studyflow.review.domain.Quiz;
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
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuizAttemptServiceTest {

    private static final UUID QUIZ_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID STUDENT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID ATTEMPT_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID Q1_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID Q2_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID DOC_ID = UUID.fromString("66666666-6666-6666-6666-666666666666");

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

    @Mock
    private LearningEventService learningEventService;

    private Clock fixedClock;
    private QuizAttemptService service;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-10-22T08:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new QuizAttemptService(
                quizRepository,
                quizQuestionRepository,
                quizQuestionSourceRepository,
                quizAttemptRepository,
                quizAnswerRepository,
                enrollmentRepository,
                learningEventService,
                fixedClock
        );
    }

    @Test
    @DisplayName("startAttempt creates attempt in IN_PROGRESS and omits answer key in questions")
    void startAttemptSuccess() {
        Quiz quiz = new Quiz(
                QUIZ_ID, STUDENT_ID, QuizCreatorRole.STUDENT, null,
                "Lý thuyết CSDL", null, null,
                QuizGenerationType.PERSONAL_STUDENT, QuizStatus.READY,
                2, null, Instant.now(fixedClock), Instant.now(fixedClock)
        );

        QuizQuestion q1 = new QuizQuestion(Q1_ID, QUIZ_ID, "Câu 1?", "A", "B", "C", "D", 0, "Giải thích 1", 1, Instant.now(fixedClock));
        QuizQuestion q2 = new QuizQuestion(Q2_ID, QUIZ_ID, "Câu 2?", "A", "B", "C", "D", 2, "Giải thích 2", 2, Instant.now(fixedClock));

        when(quizRepository.findById(QUIZ_ID)).thenReturn(Optional.of(quiz));
        when(quizQuestionRepository.findByQuizIdOrderByQuestionOrderAsc(QUIZ_ID)).thenReturn(List.of(q1, q2));

        StartQuizAttemptResult result = service.startAttempt(QUIZ_ID, STUDENT_ID);

        assertThat(result.quizId()).isEqualTo(QUIZ_ID);
        assertThat(result.totalQuestions()).isEqualTo(2);
        assertThat(result.questions()).hasSize(2);
        assertThat(result.questions().get(0).questionText()).isEqualTo("Câu 1?");

        ArgumentCaptor<QuizAttempt> attemptCaptor = ArgumentCaptor.forClass(QuizAttempt.class);
        verify(quizAttemptRepository).save(attemptCaptor.capture());
        QuizAttempt saved = attemptCaptor.getValue();
        assertThat(saved.getStatus()).isEqualTo(QuizAttemptStatus.IN_PROGRESS);
        assertThat(saved.getStudentId()).isEqualTo(STUDENT_ID);
    }

    @Test
    @DisplayName("startAttempt rejects if quiz status is not READY/PUBLISHED")
    void startAttemptNotReadyThrows() {
        Quiz quiz = new Quiz(
                QUIZ_ID, STUDENT_ID, QuizCreatorRole.STUDENT, null,
                "Lý thuyết CSDL", null, null,
                QuizGenerationType.PERSONAL_STUDENT, QuizStatus.REVIEW_REQUIRED,
                2, null, Instant.now(fixedClock), Instant.now(fixedClock)
        );
        when(quizRepository.findById(QUIZ_ID)).thenReturn(Optional.of(quiz));

        assertThatThrownBy(() -> service.startAttempt(QUIZ_ID, STUDENT_ID))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).code()).isEqualTo("QUIZ_NOT_READY"));
    }

    @Test
    @DisplayName("submitAttempt scores answers, updates attempt to SCORED, and records QUIZ_COMPLETED event")
    void submitAttemptSuccess() {
        QuizAttempt attempt = QuizAttempt.start(ATTEMPT_ID, QUIZ_ID, STUDENT_ID, 2, Instant.now(fixedClock));
        QuizQuestion q1 = new QuizQuestion(Q1_ID, QUIZ_ID, "Câu 1?", "A", "B", "C", "D", 0, "Giải thích 1", 1, Instant.now(fixedClock));
        QuizQuestion q2 = new QuizQuestion(Q2_ID, QUIZ_ID, "Câu 2?", "A", "B", "C", "D", 2, "Giải thích 2", 2, Instant.now(fixedClock));
        QuizQuestionSource s1 = new QuizQuestionSource(UUID.randomUUID(), Q1_ID, DOC_ID, 5, "Trích đoạn trang 5", Instant.now(fixedClock));

        when(quizAttemptRepository.findById(ATTEMPT_ID)).thenReturn(Optional.of(attempt));
        when(quizQuestionRepository.findByQuizIdOrderByQuestionOrderAsc(QUIZ_ID)).thenReturn(List.of(q1, q2));
        when(quizQuestionSourceRepository.findByQuestionIdIn(List.of(Q1_ID, Q2_ID))).thenReturn(List.of(s1));

        // Student chooses 0 for Q1 (correct) and 1 for Q2 (wrong: correct is 2)
        SubmitQuizAttemptCommand command = new SubmitQuizAttemptCommand(ATTEMPT_ID, STUDENT_ID, Map.of(Q1_ID, 0, Q2_ID, 1));
        SubmitQuizAttemptResult result = service.submitAttempt(command);

        assertThat(result.score()).isEqualTo(new BigDecimal("50.00"));
        assertThat(result.correctAnswersCount()).isEqualTo(1);
        assertThat(result.totalQuestionsCount()).isEqualTo(2);

        // Verify QUIZ_COMPLETED learning event recorded
        ArgumentCaptor<RecordLearningEventCommand> eventCaptor = ArgumentCaptor.forClass(RecordLearningEventCommand.class);
        verify(learningEventService).recordEvent(eventCaptor.capture());
        RecordLearningEventCommand event = eventCaptor.getValue();
        assertThat(event.studentId()).isEqualTo(STUDENT_ID);
        assertThat(event.eventType()).isEqualTo(EventType.QUIZ_COMPLETED);
        assertThat(event.quantity()).isEqualTo(2);

        // Verify review detail
        assertThat(result.questionReviews()).hasSize(2);
        QuizQuestionReviewDTO r1 = result.questionReviews().get(0);
        assertThat(r1.isCorrect()).isTrue();
        assertThat(r1.citations()).hasSize(1);
        assertThat(r1.citations().get(0).pageNumber()).isEqualTo(5);

        QuizQuestionReviewDTO r2 = result.questionReviews().get(1);
        assertThat(r2.isCorrect()).isFalse();
    }
}
