package com.studyflow.review.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.progress.application.LearningEventService;
import com.studyflow.progress.application.RecordLearningEventCommand;
import com.studyflow.progress.domain.EventType;
import com.studyflow.review.domain.Quiz;
import com.studyflow.review.domain.QuizAnswer;
import com.studyflow.review.domain.QuizAnswerRepository;
import com.studyflow.review.domain.QuizAttempt;
import com.studyflow.review.domain.QuizAttemptRepository;
import com.studyflow.review.domain.QuizAttemptStatus;
import com.studyflow.review.domain.QuizQuestion;
import com.studyflow.review.domain.QuizQuestionRepository;
import com.studyflow.review.domain.QuizQuestionSource;
import com.studyflow.review.domain.QuizQuestionSourceRepository;
import com.studyflow.review.domain.QuizRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Application service for executing quiz attempts and scoring with Java.
 */
@Service
public class QuizAttemptService {

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizQuestionSourceRepository quizQuestionSourceRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAnswerRepository quizAnswerRepository;
    private final CourseEnrollmentRepository enrollmentRepository;
    private final LearningEventService learningEventService;
    private final Clock clock;

    public QuizAttemptService(
            QuizRepository quizRepository,
            QuizQuestionRepository quizQuestionRepository,
            QuizQuestionSourceRepository quizQuestionSourceRepository,
            QuizAttemptRepository quizAttemptRepository,
            QuizAnswerRepository quizAnswerRepository,
            CourseEnrollmentRepository enrollmentRepository,
            LearningEventService learningEventService,
            Clock clock
    ) {
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizQuestionSourceRepository = quizQuestionSourceRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizAnswerRepository = quizAnswerRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.learningEventService = learningEventService;
        this.clock = clock;
    }

    /**
     * Starts a new attempt for a Quiz. Returns questions WITHOUT correct answers.
     */
    @Transactional
    public StartQuizAttemptResult startAttempt(UUID quizId, UUID studentId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "QUIZ_NOT_FOUND", "KhA'ng tAm thy bAi quiz"));

        // If quiz is attached to a course offering, verify student enrollment
        if (quiz.getCourseOfferingId() != null) {
            boolean approved = enrollmentRepository
                    .findByCourseOfferingIdAndStudentId(quiz.getCourseOfferingId(), studentId)
                    .map(e -> e.getStatus() == EnrollmentStatus.APPROVED)
                    .orElse(false);
            if (!approved && !quiz.getCreatedBy().equals(studentId)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_QUIZ", "Bn khA'ng cA3 quy?n lAm quiz nAy");
            }
        } else if (!quiz.getCreatedBy().equals(studentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_QUIZ", "Quiz cA nhAn khA'ng thuTc v? bn");
        }

        if (!quiz.canAttempt()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "QUIZ_NOT_READY", "Quiz cha s_n sAng ` lAm bAi");
        }

        List<QuizQuestion> questions = quizQuestionRepository.findByQuizIdOrderByQuestionOrderAsc(quizId);
        if (questions.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "EMPTY_QUIZ", "Quiz khA'ng cA3 cAu h?i");
        }

        Instant now = Instant.now(clock);
        UUID attemptId = UUID.randomUUID();
        QuizAttempt attempt = QuizAttempt.start(attemptId, quizId, studentId, questions.size(), now);
        quizAttemptRepository.save(attempt);

        List<QuizQuestionTakingDTO> takingQuestions = questions.stream()
                .map(q -> new QuizQuestionTakingDTO(
                        q.getId(),
                        q.getQuestionOrder(),
                        q.getQuestionText(),
                        List.of(
                                new QuestionOptionDTO(0, q.getOptionA()),
                                new QuestionOptionDTO(1, q.getOptionB()),
                                new QuestionOptionDTO(2, q.getOptionC()),
                                new QuestionOptionDTO(3, q.getOptionD())
                        )
                ))
                .toList();

        return new StartQuizAttemptResult(
                attemptId,
                quizId,
                quiz.getTitle(),
                now,
                questions.size(),
                takingQuestions
        );
    }

    /**
     * Submits an attempt, evaluates all answers in Java, records completion learning event.
     */
    @Transactional
    public SubmitQuizAttemptResult submitAttempt(SubmitQuizAttemptCommand command) {
        QuizAttempt attempt = quizAttemptRepository.findById(command.attemptId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ATTEMPT_NOT_FOUND", "KhA'ng tAm thy lt lAm bAi"));

        if (!attempt.getStudentId().equals(command.studentId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_ATTEMPT", "Lt lAm bAi khA'ng thuTc v? bn");
        }

        if (attempt.getStatus() != QuizAttemptStatus.IN_PROGRESS) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ATTEMPT_ALREADY_SUBMITTED", "BAi quiz `A `c nTp tr>c `A3");
        }

        List<QuizQuestion> questions = quizQuestionRepository.findByQuizIdOrderByQuestionOrderAsc(attempt.getQuizId());
        List<UUID> questionIds = questions.stream().map(QuizQuestion::getId).toList();
        List<QuizQuestionSource> sources = quizQuestionSourceRepository.findByQuestionIdIn(questionIds);
        Map<UUID, List<QuizQuestionSource>> sourcesByQuestion = sources.stream()
                .collect(Collectors.groupingBy(QuizQuestionSource::getQuestionId));

        Instant now = Instant.now(clock);
        int correctCount = 0;
        List<QuizAnswer> answersToSave = new ArrayList<>();
        List<QuizQuestionReviewDTO> reviews = new ArrayList<>();

        Map<UUID, Integer> submittedAnswers = command.selectedAnswers() != null ? command.selectedAnswers() : Map.of();

        for (QuizQuestion q : questions) {
            Integer selectedIndex = submittedAnswers.get(q.getId());
            boolean isCorrect = q.isCorrect(selectedIndex);
            if (isCorrect) {
                correctCount++;
            }

            BigDecimal questionScore = isCorrect ? BigDecimal.ONE : BigDecimal.ZERO;
            QuizAnswer answer = QuizAnswer.of(
                    UUID.randomUUID(),
                    attempt.getId(),
                    q.getId(),
                    selectedIndex,
                    isCorrect,
                    questionScore,
                    now
            );
            answersToSave.add(answer);

            List<QuizCitationSourceDTO> citations = sourcesByQuestion.getOrDefault(q.getId(), List.of()).stream()
                    .map(s -> new QuizCitationSourceDTO(s.getDocumentId(), s.getPageNumber(), s.getExcerpt()))
                    .toList();

            reviews.add(new QuizQuestionReviewDTO(
                    q.getId(),
                    q.getQuestionOrder(),
                    q.getQuestionText(),
                    List.of(
                            new QuestionOptionDTO(0, q.getOptionA()),
                            new QuestionOptionDTO(1, q.getOptionB()),
                            new QuestionOptionDTO(2, q.getOptionC()),
                            new QuestionOptionDTO(3, q.getOptionD())
                    ),
                    selectedIndex,
                    q.getCorrectOptionIndex(),
                    isCorrect,
                    q.getExplanation(),
                    citations
            ));
        }

        quizAnswerRepository.saveAll(answersToSave);

        attempt.score(correctCount, now);
        quizAttemptRepository.save(attempt);

        // Record QUIZ_COMPLETED event to increment Daily Goal actual and update Streak
        learningEventService.recordEvent(new RecordLearningEventCommand(
                command.studentId(),
                EventType.QUIZ_COMPLETED,
                "QUIZ_ATTEMPT",
                attempt.getId(),
                questions.size(),
                "quiz-attempt-" + attempt.getId()
        ));

        return new SubmitQuizAttemptResult(
                attempt.getId(),
                attempt.getQuizId(),
                attempt.getScore(),
                attempt.getCorrectAnswersCount(),
                attempt.getTotalQuestionsCount(),
                now,
                reviews
        );
    }
}
