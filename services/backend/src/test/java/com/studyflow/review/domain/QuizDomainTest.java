package com.studyflow.review.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class QuizDomainTest {

    private static final UUID QUIZ_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID USER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OFFERING_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Test
    @DisplayName("Quiz accept moves status from REVIEW_REQUIRED to READY and links offering")
    void acceptQuizSuccess() {
        Instant created = Instant.parse("2026-10-20T10:00:00Z");
        Instant accepted = Instant.parse("2026-10-20T11:00:00Z");

        Quiz quiz = new Quiz(
                QUIZ_ID, USER_ID, QuizCreatorRole.STUDENT, null,
                "Lý thuyết CSDL", "Mô tả", "Prompt",
                QuizGenerationType.PERSONAL_STUDENT, QuizStatus.REVIEW_REQUIRED,
                10, null, created, created
        );

        assertThat(quiz.canAttempt()).isFalse();

        quiz.accept(OFFERING_ID, accepted);

        assertThat(quiz.getStatus()).isEqualTo(QuizStatus.READY);
        assertThat(quiz.getCourseOfferingId()).isEqualTo(OFFERING_ID);
        assertThat(quiz.getUpdatedAt()).isEqualTo(accepted);
        assertThat(quiz.canAttempt()).isTrue();
    }

    @Test
    @DisplayName("Quiz accept throws IllegalStateException if not in REVIEW_REQUIRED")
    void acceptQuizInvalidState() {
        Instant now = Instant.now();
        Quiz quiz = new Quiz(
                QUIZ_ID, USER_ID, QuizCreatorRole.STUDENT, null,
                "Lý thuyết CSDL", "Mô tả", "Prompt",
                QuizGenerationType.PERSONAL_STUDENT, QuizStatus.READY,
                10, null, now, now
        );

        assertThatThrownBy(() -> quiz.accept(OFFERING_ID, now))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only quizzes in REVIEW_REQUIRED status can be accepted");
    }

    @Test
    @DisplayName("Quiz reject moves status from REVIEW_REQUIRED to REJECTED")
    void rejectQuizSuccess() {
        Instant created = Instant.parse("2026-10-20T10:00:00Z");
        Instant rejected = Instant.parse("2026-10-20T11:00:00Z");

        Quiz quiz = new Quiz(
                QUIZ_ID, USER_ID, QuizCreatorRole.STUDENT, null,
                "Lý thuyết CSDL", "Mô tả", "Prompt",
                QuizGenerationType.PERSONAL_STUDENT, QuizStatus.REVIEW_REQUIRED,
                10, null, created, created
        );

        quiz.reject(rejected);

        assertThat(quiz.getStatus()).isEqualTo(QuizStatus.REJECTED);
        assertThat(quiz.getUpdatedAt()).isEqualTo(rejected);
        assertThat(quiz.canAttempt()).isFalse();
    }

    @Test
    @DisplayName("Teacher can publish quiz, non-teacher cannot")
    void publishQuizRules() {
        Instant now = Instant.now();
        Quiz teacherQuiz = new Quiz(
                QUIZ_ID, USER_ID, QuizCreatorRole.TEACHER, OFFERING_ID,
                "Kiểm tra 15 phút", null, null,
                QuizGenerationType.COURSE_TEACHER, QuizStatus.REVIEW_REQUIRED,
                5, null, now, now
        );

        teacherQuiz.publish(now);
        assertThat(teacherQuiz.getStatus()).isEqualTo(QuizStatus.PUBLISHED);
        assertThat(teacherQuiz.canAttempt()).isTrue();

        Quiz studentQuiz = new Quiz(
                QUIZ_ID, USER_ID, QuizCreatorRole.STUDENT, null,
                "Ôn tập cá nhân", null, null,
                QuizGenerationType.PERSONAL_STUDENT, QuizStatus.REVIEW_REQUIRED,
                5, null, now, now
        );

        assertThatThrownBy(() -> studentQuiz.publish(now))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only teachers can publish quizzes");
    }

    @Test
    @DisplayName("QuizQuestion validates correctOptionIndex bounds and evaluates correctness")
    void quizQuestionOptionsAndEvaluation() {
        Instant now = Instant.now();
        QuizQuestion question = new QuizQuestion(
                UUID.randomUUID(), QUIZ_ID,
                "Khóa chính là gì?",
                "Tập thuộc tính xác định duy nhất bộ",
                "Tập thuộc tính có thể null",
                "Thuộc tính tùy ý",
                "Không có đáp án đúng",
                0,
                "Khóa chính phải xác định duy nhất và không null",
                1,
                now
        );

        assertThat(question.getOption(0)).isEqualTo("Tập thuộc tính xác định duy nhất bộ");
        assertThat(question.isCorrect(0)).isTrue();
        assertThat(question.isCorrect(1)).isFalse();
        assertThat(question.isCorrect(null)).isFalse();

        assertThatThrownBy(() -> new QuizQuestion(
                UUID.randomUUID(), QUIZ_ID, "Q", "A", "B", "C", "D", 4, "exp", 1, now
        )).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("QuizAttempt calculates score percentage and rounds to 2 decimal places")
    void quizAttemptScoring() {
        Instant started = Instant.parse("2026-10-20T10:00:00Z");
        Instant submitted = Instant.parse("2026-10-20T10:15:00Z");
        UUID attemptId = UUID.randomUUID();

        QuizAttempt attempt = QuizAttempt.start(attemptId, QUIZ_ID, USER_ID, 10, started);
        assertThat(attempt.getStatus()).isEqualTo(QuizAttemptStatus.IN_PROGRESS);
        assertThat(attempt.getScore()).isNull();

        attempt.score(8, submitted);

        assertThat(attempt.getStatus()).isEqualTo(QuizAttemptStatus.SCORED);
        assertThat(attempt.getCorrectAnswersCount()).isEqualTo(8);
        assertThat(attempt.getTotalQuestionsCount()).isEqualTo(10);
        assertThat(attempt.getScore()).isEqualTo(new BigDecimal("80.00"));
        assertThat(attempt.getSubmittedAt()).isEqualTo(submitted);

        // Cannot score again
        assertThatThrownBy(() -> attempt.score(9, submitted))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("QuizAttempt handles fractional score rounding correctly")
    void quizAttemptFractionalScoring() {
        Instant now = Instant.now();
        QuizAttempt attempt = QuizAttempt.start(UUID.randomUUID(), QUIZ_ID, USER_ID, 3, now);

        attempt.score(1, now); // 1/3 = 33.333... -> 33.33
        assertThat(attempt.getScore()).isEqualTo(new BigDecimal("33.33"));
    }
}
