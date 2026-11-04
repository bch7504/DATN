package com.studyflow.assignment.application;

import com.studyflow.assignment.api.AssignmentRequests;
import com.studyflow.assignment.api.AssignmentResponses;
import com.studyflow.assignment.domain.AssignmentStatus;
import com.studyflow.assignment.domain.AssignmentSubmission;
import com.studyflow.assignment.domain.AssignmentSubmissionRepository;
import com.studyflow.assignment.domain.AssignmentType;
import com.studyflow.assignment.domain.CourseAssignment;
import com.studyflow.assignment.domain.CourseAssignmentRepository;
import com.studyflow.assignment.domain.SubmissionStatus;
import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.review.application.QuizAttemptService;
import com.studyflow.review.application.StartQuizAttemptResult;
import com.studyflow.review.application.SubmitQuizAttemptCommand;
import com.studyflow.review.application.SubmitQuizAttemptResult;
import com.studyflow.review.domain.Quiz;
import com.studyflow.review.domain.QuizAttempt;
import com.studyflow.review.domain.QuizAttemptRepository;
import com.studyflow.review.domain.QuizAttemptStatus;
import com.studyflow.review.domain.QuizAnswer;
import com.studyflow.review.domain.QuizAnswerRepository;
import com.studyflow.review.domain.QuizCreatorRole;
import com.studyflow.review.domain.QuizQuestion;
import com.studyflow.review.domain.QuizQuestionRepository;
import com.studyflow.review.domain.QuizRepository;
import com.studyflow.review.domain.QuizStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Coordinates Teacher Quiz drafts with Java-owned class assignments and scored attempts. */
@Service
public class QuizAssignmentService {
    private static final Duration REMINDER_LEAD = Duration.ofHours(24);
    private final CourseAssignmentRepository assignments;
    private final AssignmentSubmissionRepository submissions;
    private final CourseOfferingRepository offerings;
    private final CourseEnrollmentRepository enrollments;
    private final QuizRepository quizzes;
    private final QuizAttemptRepository quizAttempts;
    private final QuizAnswerRepository quizAnswers;
    private final QuizQuestionRepository quizQuestions;
    private final QuizAttemptService attempts;
    private final Clock clock;

    public QuizAssignmentService(CourseAssignmentRepository assignments,
                                 AssignmentSubmissionRepository submissions,
                                 CourseOfferingRepository offerings,
                                 CourseEnrollmentRepository enrollments,
                                 QuizRepository quizzes,
                                 QuizAttemptRepository quizAttempts,
                                 QuizAnswerRepository quizAnswers,
                                 QuizQuestionRepository quizQuestions,
                                 QuizAttemptService attempts,
                                 Clock clock) {
        this.assignments = assignments;
        this.submissions = submissions;
        this.offerings = offerings;
        this.enrollments = enrollments;
        this.quizzes = quizzes;
        this.quizAttempts = quizAttempts;
        this.quizAnswers = quizAnswers;
        this.quizQuestions = quizQuestions;
        this.attempts = attempts;
        this.clock = clock;
    }

    /**
     * Args: authenticated Teacher, owned offering and validated request with type QUIZ/quizId.
     * Input: a PUBLISHED Teacher Quiz in the same active offering. Output: persisted DRAFT assignment.
     * Errors: 403 ownership, 404 missing rows, 409 invalid state, 422 invalid request.
     */
    @Transactional
    public CourseAssignment createDraft(UUID teacherId, UUID offeringId, AssignmentRequests.CreateDraft input) {
        if (input.type() != AssignmentType.QUIZ || input.quizId() == null) {
            throw new ValidationException("INVALID_QUIZ_ASSIGNMENT", "Hãy chọn Quiz đã duyệt để giao bài.");
        }
        CourseOffering offering = offerings.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
        if (!offering.isOwnedBy(teacherId)) throw new ForbiddenException("FORBIDDEN_COURSE", "Bạn không sở hữu lớp này.");
        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ConflictException("COURSE_NOT_ACTIVE", "Chỉ lớp đang hoạt động mới nhận bài tập.");
        }
        Quiz quiz = quizzes.findById(input.quizId())
                .orElseThrow(() -> new ResourceNotFoundException("QUIZ_NOT_FOUND", "Không tìm thấy Quiz."));
        if (!quiz.getCreatedBy().equals(teacherId) || quiz.getCreatorRole() != QuizCreatorRole.TEACHER
                || !offeringId.equals(quiz.getCourseOfferingId())) {
            throw new ForbiddenException("FORBIDDEN_QUIZ", "Quiz không thuộc giảng viên hoặc lớp này.");
        }
        if (quiz.getStatus() != QuizStatus.PUBLISHED) {
            throw new ConflictException("QUIZ_NOT_PUBLISHED", "Quiz phải được duyệt trước khi giao.");
        }
        Instant now = clock.instant();
        if (!input.dueAt().isAfter(now)) throw new ValidationException("INVALID_DUE_AT", "Hạn nộp phải ở tương lai.");
        CourseAssignment assignment = new CourseAssignment(UUID.randomUUID(), offeringId, teacherId,
                AssignmentType.QUIZ, quiz.getId(), input.title().trim(), input.description().trim(),
                input.dueAt(), input.dueAt().minus(REMINDER_LEAD), now);
        return assignments.save(assignment);
    }

    /**
     * Args: authenticated Student and published Quiz assignment UUID.
     * Input: APPROVED enrollment and Teacher Quiz linked to that assignment.
     * Output: a new IN_PROGRESS attempt with questions but no correct answers.
     * Errors: 403 scope, 404 assignment, 409 wrong type/state, Quiz validation errors.
     */
    @Transactional
    public StartQuizAttemptResult start(UUID studentId, UUID assignmentId) {
        CourseAssignment assignment = requireStudentQuizAssignment(studentId, assignmentId);
        return attempts.startAssignmentAttempt(assignment.getQuizId(), studentId);
    }

    /**
     * Args: authenticated Student, assignment UUID, existing attempt UUID and selected option indexes.
     * Input: APPROVED enrollment; attempt must belong to Student and linked Quiz. Output: scored attempt.
     * Errors: 403 scope/owner, 404 assignment/attempt, 409 wrong type/state, Quiz validation errors.
     * Side effects: stores Java score and latest assignment submission atomically.
     */
    @Transactional
    public SubmitQuizAttemptResult submit(UUID studentId, UUID assignmentId, AssignmentRequests.SubmitQuiz input) {
        CourseAssignment assignment = requireStudentQuizAssignment(studentId, assignmentId);
        QuizAttempt attempt = quizAttempts.findById(input.attemptId())
                .orElseThrow(() -> new ResourceNotFoundException("ATTEMPT_NOT_FOUND", "Không tìm thấy lượt làm bài."));
        if (!attempt.getStudentId().equals(studentId)) {
            throw new ForbiddenException("FORBIDDEN_ATTEMPT", "Lượt làm bài không thuộc sinh viên này.");
        }
        if (!attempt.getQuizId().equals(assignment.getQuizId())) {
            throw new ConflictException("ATTEMPT_ASSIGNMENT_MISMATCH", "Lượt làm bài không thuộc bài tập này.");
        }
        if (attempt.getStatus() == QuizAttemptStatus.SCORED) {
            return submissions.findByAssignmentIdAndStudentId(assignmentId, studentId)
                    .filter(saved -> input.attemptId().equals(saved.getQuizAttemptId()))
                    .map(saved -> attempts.getScoredAttempt(input.attemptId(), studentId))
                    .orElseThrow(() -> new ConflictException("ATTEMPT_ALREADY_SUBMITTED",
                            "Lượt làm bài đã được nộp cho bài tập khác hoặc không còn là bài nộp hiện tại."));
        }
        if (attempt.getStatus() != QuizAttemptStatus.IN_PROGRESS) {
            throw new ConflictException("ATTEMPT_NOT_SUBMITTABLE", "Lượt làm bài không thể nộp ở trạng thái hiện tại.");
        }
        SubmitQuizAttemptResult result = attempts.submitAttempt(new SubmitQuizAttemptCommand(
                input.attemptId(), studentId, input.answers()));
        Instant now = clock.instant();
        SubmissionStatus status = now.isAfter(assignment.getDueAt()) ? SubmissionStatus.LATE : SubmissionStatus.ON_TIME;
        AssignmentSubmission submission = submissions.findByAssignmentIdAndStudentId(assignmentId, studentId)
                .map(existing -> { existing.resubmit(null, now, status); return existing; })
                .orElseGet(() -> new AssignmentSubmission(UUID.randomUUID(), assignmentId, studentId, null, now, status));
        submission.attachQuizResult(result.attemptId(), result.score(), now);
        submissions.save(submission);
        return result;
    }

    /** Args: owning Teacher, assignment and Student IDs. Output: persisted scored attempt detail. Errors: 403/404/409. */
    @Transactional(readOnly = true)
    public SubmitQuizAttemptResult detail(UUID teacherId, UUID assignmentId, UUID studentId) {
        CourseAssignment assignment = assignments.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập."));
        if (!assignment.getTeacherId().equals(teacherId)) throw new ForbiddenException("FORBIDDEN_ASSIGNMENT", "Bạn không sở hữu bài tập này.");
        if (assignment.getType() != AssignmentType.QUIZ) throw new ConflictException("NOT_QUIZ_ASSIGNMENT", "Đây không phải bài tập trắc nghiệm.");
        AssignmentSubmission submission = submissions.findByAssignmentIdAndStudentId(assignmentId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("SUBMISSION_NOT_FOUND", "Sinh viên chưa nộp bài."));
        if (submission.getQuizAttemptId() == null) throw new ApiException(HttpStatus.CONFLICT, "QUIZ_ATTEMPT_MISSING", "Bài nộp chưa có lượt làm Quiz.");
        return attempts.getScoredAttempt(submission.getQuizAttemptId(), studentId);
    }

    /**
     * Args: owning Teacher and QUIZ assignment UUID.
     * Input: current linked attempt of each submitted Student only; repeated older attempts are excluded.
     * Output: ordered per-question submission count, wrong count and percentage. Errors: 403/404/409.
     */
    @Transactional(readOnly = true)
    public List<AssignmentResponses.QuizQuestionAnalytics> questionAnalytics(UUID teacherId, UUID assignmentId) {
        CourseAssignment assignment = assignments.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập."));
        if (!assignment.getTeacherId().equals(teacherId)) {
            throw new ForbiddenException("FORBIDDEN_ASSIGNMENT", "Bạn không sở hữu bài tập này.");
        }
        if (assignment.getType() != AssignmentType.QUIZ || assignment.getQuizId() == null) {
            return List.of();
        }
        List<UUID> attemptIds = submissions.findByAssignmentId(assignmentId).stream()
                .map(AssignmentSubmission::getQuizAttemptId).filter(java.util.Objects::nonNull).toList();
        if (attemptIds.isEmpty()) {
            return quizQuestions.findByQuizIdOrderByQuestionOrderAsc(assignment.getQuizId()).stream()
                    .map(question -> analytics(question, 0, 0)).toList();
        }
        Map<UUID, List<QuizAnswer>> byQuestion = quizAnswers.findByAttemptIdIn(attemptIds).stream()
                .collect(Collectors.groupingBy(QuizAnswer::getQuestionId));
        return quizQuestions.findByQuizIdOrderByQuestionOrderAsc(assignment.getQuizId()).stream()
                .map(question -> {
                    List<QuizAnswer> answers = byQuestion.getOrDefault(question.getId(), List.of());
                    long wrong = answers.stream().filter(answer -> !answer.isCorrect()).count();
                    return analytics(question, answers.size(), wrong);
                }).toList();
    }

    private static AssignmentResponses.QuizQuestionAnalytics analytics(
            QuizQuestion question, long submissionCount, long wrongCount) {
        double rate = submissionCount == 0 ? 0.0 : Math.round((wrongCount * 10000.0) / submissionCount) / 100.0;
        return new AssignmentResponses.QuizQuestionAnalytics(question.getId(), question.getQuestionOrder(),
                question.getQuestionText(), submissionCount, wrongCount, rate);
    }

    private CourseAssignment requireStudentQuizAssignment(UUID studentId, UUID assignmentId) {
        CourseAssignment assignment = assignments.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập."));
        if (assignment.getStatus() != AssignmentStatus.PUBLISHED) throw new ConflictException("ASSIGNMENT_NOT_PUBLISHED", "Bài tập chưa được giao.");
        if (assignment.getType() != AssignmentType.QUIZ || assignment.getQuizId() == null) {
            throw new ConflictException("NOT_QUIZ_ASSIGNMENT", "Đây không phải bài tập trắc nghiệm.");
        }
        boolean approved = enrollments.findByCourseOfferingIdAndStudentId(assignment.getCourseOfferingId(), studentId)
                .map(enrollment -> enrollment.getStatus() == EnrollmentStatus.APPROVED).orElse(false);
        if (!approved) throw new ForbiddenException("FORBIDDEN_ASSIGNMENT", "Bạn chưa được duyệt vào lớp này.");
        return assignment;
    }
}
