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
import com.studyflow.review.domain.QuizCreatorRole;
import com.studyflow.review.domain.QuizQuestion;
import com.studyflow.review.domain.QuizQuestionRepository;
import com.studyflow.review.domain.QuizQuestionSource;
import com.studyflow.review.domain.QuizQuestionSourceRepository;
import com.studyflow.review.domain.QuizRepository;
import com.studyflow.review.domain.QuizStatus;
import com.studyflow.review.dto.CourseOfferingReviewSummaryDTO;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service managing Quiz review, accept/reject decisions, and wrong-answer citation projection.
 */
@Service
public class QuizReviewService {

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizQuestionSourceRepository quizQuestionSourceRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAnswerRepository quizAnswerRepository;
    private final CourseEnrollmentRepository enrollmentRepository;
    private final Clock clock;

    public QuizReviewService(
            QuizRepository quizRepository,
            QuizQuestionRepository quizQuestionRepository,
            QuizQuestionSourceRepository quizQuestionSourceRepository,
            QuizAttemptRepository quizAttemptRepository,
            QuizAnswerRepository quizAnswerRepository,
            CourseEnrollmentRepository enrollmentRepository,
            Clock clock
    ) {
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizQuestionSourceRepository = quizQuestionSourceRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizAnswerRepository = quizAnswerRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.clock = clock;
    }

    /**
     * Student accepts a generated Quiz, transitioning it to READY and optionally linking a Course Offering.
     */
    @Transactional
    public void acceptQuiz(UUID quizId, UUID studentId, UUID targetCourseOfferingId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "QUIZ_NOT_FOUND", "KhA'ng tAm thy bAi quiz"));

        if (!quiz.getCreatedBy().equals(studentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_QUIZ", "Quiz khA'ng thuTc v? bn");
        }

        if (targetCourseOfferingId != null) {
            boolean approved = enrollmentRepository
                    .findByCourseOfferingIdAndStudentId(targetCourseOfferingId, studentId)
                    .map(e -> e.getStatus() == EnrollmentStatus.APPROVED)
                    .orElse(false);
            if (!approved) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_OFFERING", "Bn cha tham gia l>p h?c ph n nAy");
            }
        }

        quiz.accept(targetCourseOfferingId, Instant.now(clock));
        quizRepository.save(quiz);
    }

    /**
     * Student rejects a generated Quiz, transitioning it to REJECTED.
     */
    @Transactional
    public void rejectQuiz(UUID quizId, UUID studentId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "QUIZ_NOT_FOUND", "KhA'ng tAm thy bAi quiz"));

        if (!quiz.getCreatedBy().equals(studentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_QUIZ", "Quiz khA'ng thuTc v? bn");
        }

        quiz.reject(Instant.now(clock));
        quizRepository.save(quiz);
    }

    /**
     * Lists personal quizzes of the student (courseOfferingId is null).
     */
    @Transactional(readOnly = true)
    public List<QuizSummaryDTO> getPersonalQuizzes(UUID studentId) {
        List<Quiz> quizzes = quizRepository.findByCreatedByAndCourseOfferingIdIsNullOrderByCreatedAtDesc(studentId);
        return toSummaries(quizzes, studentId);
    }

    /**
     * Lists quizzes belonging to a specific Course Offering.
     */
    @Transactional(readOnly = true)
    public List<QuizSummaryDTO> getCourseQuizzes(UUID courseOfferingId, UUID studentId) {
        boolean approved = enrollmentRepository
                .findByCourseOfferingIdAndStudentId(courseOfferingId, studentId)
                .map(e -> e.getStatus() == EnrollmentStatus.APPROVED)
                .orElse(false);
        if (!approved) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_OFFERING", "Bn cha tham gia l>p h?c ph n nAy");
        }

        List<Quiz> quizzes = quizRepository.findByCourseOfferingIdAndStatusInOrderByCreatedAtDesc(
                courseOfferingId, List.of(QuizStatus.READY, QuizStatus.PUBLISHED)
        );
        return toSummaries(quizzes, studentId);
    }

    /**
     * Aggregates wrong-answer review items from past attempts.
     * Strictly grounded on document + page number; NO AI speculation of student weaknesses.
     */
    @Transactional(readOnly = true)
    public List<WrongAnswerReviewItemDTO> getWrongAnswerReviewItems(UUID courseOfferingId, UUID studentId) {
        List<Quiz> quizzes = quizRepository.findByCourseOfferingIdAndStatusInOrderByCreatedAtDesc(
                courseOfferingId, List.of(QuizStatus.READY, QuizStatus.PUBLISHED)
        );
        if (quizzes.isEmpty()) {
            return List.of();
        }

        List<UUID> quizIds = quizzes.stream().map(Quiz::getId).toList();
        List<QuizAttempt> attempts = quizAttemptRepository.findByQuizIdInAndStudentIdOrderByCreatedAtDesc(quizIds, studentId);
        if (attempts.isEmpty()) {
            return List.of();
        }

        // Collect all wrong answers from these attempts
        List<QuizAnswer> wrongAnswers = new ArrayList<>();
        Map<UUID, Instant> questionAttemptTime = new java.util.HashMap<>();
        for (QuizAttempt att : attempts) {
            List<QuizAnswer> answers = quizAnswerRepository.findByAttemptIdAndIsCorrectFalse(att.getId());
            for (QuizAnswer a : answers) {
                wrongAnswers.add(a);
                questionAttemptTime.putIfAbsent(a.getQuestionId(), att.getSubmittedAt() != null ? att.getSubmittedAt() : att.getStartedAt());
            }
        }

        if (wrongAnswers.isEmpty()) {
            return List.of();
        }

        // Distinct question IDs
        Set<UUID> questionIds = wrongAnswers.stream().map(QuizAnswer::getQuestionId).collect(Collectors.toSet());
        List<QuizQuestion> questions = quizQuestionRepository.findAllById(questionIds);
        Map<UUID, QuizQuestion> questionMap = questions.stream().collect(Collectors.toMap(QuizQuestion::getId, q -> q));

        List<QuizQuestionSource> sources = quizQuestionSourceRepository.findByQuestionIdIn(questionIds);
        Map<UUID, List<QuizQuestionSource>> sourcesByQuestion = sources.stream()
                .collect(Collectors.groupingBy(QuizQuestionSource::getQuestionId));

        // Group by questionId to return distinct items
        Map<UUID, QuizAnswer> latestWrongAnswer = wrongAnswers.stream()
                .collect(Collectors.toMap(
                        QuizAnswer::getQuestionId,
                        a -> a,
                        (existing, replacement) -> existing
                ));

        List<WrongAnswerReviewItemDTO> result = new ArrayList<>();
        for (Map.Entry<UUID, QuizAnswer> entry : latestWrongAnswer.entrySet()) {
            QuizQuestion q = questionMap.get(entry.getKey());
            if (q == null) continue;

            QuizAnswer a = entry.getValue();
            String studentSelectedText = a.getSelectedOptionIndex() != null ? q.getOption(a.getSelectedOptionIndex()) : "KhA'ng ch?n";
            String correctOptionText = q.getOption(q.getCorrectOptionIndex());

            List<QuizCitationSourceDTO> citations = sourcesByQuestion.getOrDefault(q.getId(), List.of()).stream()
                    .map(s -> new QuizCitationSourceDTO(s.getDocumentId(), s.getPageNumber(), s.getExcerpt()))
                    .toList();

            result.add(new WrongAnswerReviewItemDTO(
                    q.getId(),
                    q.getQuestionText(),
                    a.getSelectedOptionIndex(),
                    studentSelectedText,
                    q.getCorrectOptionIndex(),
                    correctOptionText,
                    q.getExplanation(),
                    citations,
                    questionAttemptTime.get(q.getId())
            ));
        }

        result.sort(Comparator.comparing(WrongAnswerReviewItemDTO::lastAttemptedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }

    private List<QuizSummaryDTO> toSummaries(List<Quiz> quizzes, UUID studentId) {
        if (quizzes.isEmpty()) return List.of();
        List<UUID> quizIds = quizzes.stream().map(Quiz::getId).toList();
        List<QuizAttempt> attempts = quizAttemptRepository.findByQuizIdInAndStudentIdOrderByCreatedAtDesc(quizIds, studentId);
        Map<UUID, List<QuizAttempt>> attemptsByQuiz = attempts.stream()
                .collect(Collectors.groupingBy(QuizAttempt::getQuizId));

        return quizzes.stream().map(q -> {
            List<QuizAttempt> atts = attemptsByQuiz.getOrDefault(q.getId(), List.of());
            int count = atts.size();
            BigDecimal highest = atts.stream()
                    .map(QuizAttempt::getScore)
                    .filter(Objects::nonNull)
                    .max(BigDecimal::compareTo)
                    .orElse(null);

            return new QuizSummaryDTO(
                    q.getId(),
                    q.getTitle(),
                    q.getDescription(),
                    q.getStatus(),
                    q.getCourseOfferingId(),
                    q.getQuestionCount(),
                    q.getCreatedAt(),
                    count,
                    highest
            );
        }).toList();
    }

    /**
     * Lists enrolled Course Offerings review summary.
     */
    @Transactional(readOnly = true)
    public List<CourseOfferingReviewSummaryDTO> getEnrolledCourseOfferingsReview(UUID studentId) {
        List<CourseEnrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED);
        if (enrollments.isEmpty()) {
            return List.of();
        }

        List<CourseOfferingReviewSummaryDTO> result = new ArrayList<>();
        for (CourseEnrollment e : enrollments) {
            UUID offeringId = e.getCourseOfferingId();
            List<Quiz> quizzes = quizRepository.findByCourseOfferingIdAndStatusInOrderByCreatedAtDesc(
                    offeringId, List.of(QuizStatus.READY, QuizStatus.PUBLISHED)
            );
            int quizCount = quizzes.size();
            BigDecimal avgScore = null;
            Instant latestAttemptAt = null;

            if (quizCount > 0) {
                List<UUID> quizIds = quizzes.stream().map(Quiz::getId).toList();
                List<QuizAttempt> attempts = quizAttemptRepository.findByQuizIdInAndStudentIdOrderByCreatedAtDesc(quizIds, studentId);
                List<BigDecimal> scores = attempts.stream()
                        .map(QuizAttempt::getScore)
                        .filter(Objects::nonNull)
                        .toList();

                if (!scores.isEmpty()) {
                    BigDecimal sum = scores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                    avgScore = sum.divide(BigDecimal.valueOf(scores.size()), 2, java.math.RoundingMode.HALF_UP);
                }

                if (!attempts.isEmpty()) {
                    latestAttemptAt = attempts.get(0).getCreatedAt();
                }
            }

            result.add(new CourseOfferingReviewSummaryDTO(offeringId, quizCount, avgScore, latestAttemptAt));
        }

        return result;
    }

}
