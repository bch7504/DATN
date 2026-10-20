package com.studyflow.assignment.application;

import com.studyflow.assignment.api.AssignmentRequests;
import com.studyflow.assignment.api.AssignmentResponses;
import com.studyflow.assignment.domain.AssignmentStatus;
import com.studyflow.assignment.domain.AssignmentSubmission;
import com.studyflow.assignment.domain.AssignmentSubmissionAttachment;
import com.studyflow.assignment.domain.AssignmentSubmissionAttachmentRepository;
import com.studyflow.assignment.domain.CourseAssignment;
import com.studyflow.assignment.domain.CourseAssignmentRepository;
import com.studyflow.assignment.domain.AssignmentSubmissionRepository;
import com.studyflow.assignment.domain.SubmissionStatus;
import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.user.domain.UserAccount;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import com.studyflow.common.exception.ApiException;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class AssignmentService {
    private static final Duration DEFAULT_REMINDER_LEAD = Duration.ofHours(24);
    private static final int REMINDER_BATCH_SIZE = 100;
    private final CourseAssignmentRepository assignments;
    private final AssignmentSubmissionRepository submissions;
    private final AssignmentSubmissionAttachmentRepository attachments;
    private final CourseOfferingRepository offerings;
    private final CourseEnrollmentRepository enrollments;
    private final UserAccountStore users;
    private final NotificationStore notifications;
    private final AttachmentCleanupQueue attachmentCleanup;
    private final Clock clock;
    private final ObjectProvider<AssignmentAttachmentStorage> attachmentStorageProvider;

    /**
     * Args: repositories, identity/notification stores, clock, optional attachment storage and durable cleanup queue.
     * Input: Spring-managed backend adapters; all required except the storage provider's optional value.
     * Output: service instance; constructor has no side effects. Errors: missing required beans fail startup.
     */
    public AssignmentService(CourseAssignmentRepository assignments,
                             AssignmentSubmissionRepository submissions,
                             CourseOfferingRepository offerings,
                             CourseEnrollmentRepository enrollments,
                             UserAccountStore users,
                             NotificationStore notifications,
                             Clock clock,
                             AssignmentSubmissionAttachmentRepository attachments,
                             ObjectProvider<AssignmentAttachmentStorage> attachmentStorageProvider,
                             AttachmentCleanupQueue attachmentCleanup) {
        this.assignments = assignments;
        this.submissions = submissions;
        this.attachments = attachments;
        this.offerings = offerings;
        this.enrollments = enrollments;
        this.users = users;
        this.notifications = notifications;
        this.clock = clock;
        this.attachmentStorageProvider = attachmentStorageProvider;
        this.attachmentCleanup = attachmentCleanup;
    }

    /**
     * Creates a draft for a class owned by the authenticated Teacher.
     * Args: teacherId and offeringId are authenticated/path UUIDs; input is a validated title,
     * description and future dueAt. Output: persisted draft. Errors: 404 unknown class, 403
     * non-owner, 409 inactive class, 422 invalid date or content. Side effect: database insert.
     */
    @Transactional
    public CourseAssignment createDraft(UUID teacherId, UUID offeringId, AssignmentRequests.CreateDraft input) {
        CourseOffering offering = requireOwnedOffering(teacherId, offeringId);
        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ConflictException("COURSE_NOT_ACTIVE", "Chỉ lớp đang hoạt động mới nhận bài tập mới.");
        }
        Instant now = clock.instant();
        validateDueAt(input.dueAt(), now);
        CourseAssignment assignment = new CourseAssignment(UUID.randomUUID(), offeringId, teacherId,
                input.title().trim(), input.description().trim(), input.dueAt(),
                input.dueAt().minus(DEFAULT_REMINDER_LEAD), now);
        return assignments.save(assignment);
    }

    /**
     * Updates all editable fields of a draft owned by the authenticated Teacher.
     * Args: teacherId, assignmentId and validated replacement fields. Input must have a future dueAt.
     * Output: updated draft. Errors: 404 unknown assignment, 403 non-owner, 409 not draft,
     * 422 invalid input. Side effect: updates the draft timestamp and reminder time.
     */
    @Transactional
    public CourseAssignment updateDraft(UUID teacherId, UUID assignmentId, AssignmentRequests.UpdateDraft input) {
        CourseAssignment assignment = requireOwnedAssignment(teacherId, assignmentId);
        Instant now = clock.instant();
        validateDueAt(input.dueAt(), now);
        try {
            assignment.update(input.title().trim(), input.description().trim(), input.dueAt(),
                    input.dueAt().minus(DEFAULT_REMINDER_LEAD), now);
        } catch (IllegalStateException exception) {
            throw new ConflictException("ASSIGNMENT_NOT_DRAFT", "Chỉ có thể sửa bài tập ở trạng thái bản nháp.");
        }
        return assignments.save(assignment);
    }

    /**
     * Publishes a Teacher-owned draft to approved students in its class.
     * Args: authenticated teacherId and assignmentId. Input must identify an owned draft in an active class.
     * Output: published assignment. Errors: 404 missing, 403 non-owner, 409 invalid state/class.
     * Side effect: changes status and makes the assignment visible to approved Students.
     */
    @Transactional
    public CourseAssignment publish(UUID teacherId, UUID assignmentId) {
        CourseAssignment assignment = requireOwnedAssignment(teacherId, assignmentId);
        validateDueAt(assignment.getDueAt(), clock.instant());
        CourseOffering offering = requireOwnedOffering(teacherId, assignment.getCourseOfferingId());
        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ConflictException("COURSE_NOT_ACTIVE", "Không thể công bố bài tập trong lớp không hoạt động.");
        }
        try {
            assignment.publish(clock.instant());
        } catch (IllegalStateException exception) {
            throw new ConflictException("ASSIGNMENT_NOT_DRAFT", "Bài tập không còn ở trạng thái bản nháp.");
        }
        CourseAssignment published = assignments.save(assignment);
        for (CourseEnrollment enrollment : enrollments.findByCourseOfferingIdAndStatus(
                assignment.getCourseOfferingId(), EnrollmentStatus.APPROVED)) {
            notifications.createAssignmentPublishedIfAbsent(enrollment.getStudentId(), assignment.getId(),
                    assignment.getTitle(), assignment.getDueAt(), clock.instant());
        }
        return published;
    }

    /** Lists class assignments for the owning Teacher; draft and published items are included. */
    @Transactional(readOnly = true)
    public List<CourseAssignment> listTeacher(UUID teacherId, UUID offeringId) {
        requireOwnedOffering(teacherId, offeringId);
        return assignments.findByCourseOfferingIdOrderByCreatedAtDesc(offeringId);
    }

    /** Lists published assignments for all classes where the authenticated Student is approved. */
    @Transactional(readOnly = true)
    public List<AssignmentResponses.Assignment> listStudent(UUID studentId) {
        List<UUID> offeringIds = enrollments.findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED)
                .stream().map(CourseEnrollment::getCourseOfferingId).distinct().toList();
        if (offeringIds.isEmpty()) return List.of();
        return assignments.findByCourseOfferingIdInAndStatusOrderByDueAtAsc(offeringIds, AssignmentStatus.PUBLISHED)
                .stream().map(assignment -> AssignmentResponses.Assignment.from(assignment,
                        submissions.findByAssignmentIdAndStudentId(assignment.getId(), studentId)
                                .map(this::submissionResponse).orElse(null)))
                .toList();
    }

    /**
     * Creates or replaces a Student answer, including late submissions.
     * Args: approved studentId, assignmentId and nonblank answerText. Input is limited by the request DTO.
     * Output: stored latest submission. Errors: 404 unknown/unpublished assignment, 403 not enrolled,
     * 409 closed class/assignment, 422 invalid answer, or database failure.
     * Side effects: replaces current answer, removes old file metadata, queues old objects for deletion
     * after commit. No submission history is retained.
     */
    @Transactional
    public AssignmentSubmission submit(UUID studentId, UUID assignmentId, AssignmentRequests.SubmitAnswer input) {
        CourseAssignment assignment = requireStudentAssignment(studentId, assignmentId);
        Instant now = clock.instant();
        SubmissionStatus status = now.isAfter(assignment.getDueAt()) ? SubmissionStatus.LATE : SubmissionStatus.ON_TIME;
        AssignmentSubmission submission = submissions.findByAssignmentIdAndStudentId(assignmentId, studentId)
                .map(existing -> { existing.resubmit(input.answerText().trim(), now, status); return existing; })
                .orElseGet(() -> new AssignmentSubmission(UUID.randomUUID(), assignmentId, studentId,
                        input.answerText().trim(), now, status));
        AssignmentSubmission saved = submissions.save(submission);
        queueReplacedAttachments(saved.getId(), now);
        return saved;
    }

    /**
     * Replaces the Student's current answer and attachments with one multipart submission.
     * Args: student/assignment UUIDs, optional answer text and 1..5 multipart files. Input is restricted to
     * approved enrollment, allowlisted file signatures, 10 MiB/file and 25 MiB total. Output: stored submission.
     * Errors: 401/403/404/409/422/503/502 or persistence failure. Side effects: uploads new private objects,
     * replaces old metadata and queues old objects for deletion after commit.
     * Uploads are compensated on rollback; old objects remain intact until replacement commits.
     */
    @Transactional
    public AssignmentSubmission submitAttachments(UUID studentId, UUID assignmentId, String answerText,
                                                   List<MultipartFile> files) {
        String cleanText = answerText == null || answerText.isBlank() ? null : answerText.trim();
        List<MultipartFile> uploadedFiles = files == null ? List.of() : files.stream()
                .filter(file -> file != null && !file.isEmpty()).toList();
        if (cleanText == null && uploadedFiles.isEmpty()) {
            throw new ValidationException("EMPTY_SUBMISSION", "Hãy nhập câu trả lời hoặc đính kèm ít nhất một tệp.");
        }
        if (uploadedFiles.isEmpty() || uploadedFiles.size() > 5) {
            throw new ValidationException("INVALID_ATTACHMENT_COUNT", "Mỗi lần nộp phải đính kèm từ 1 đến 5 tệp.");
        }
        CourseAssignment assignment = requireStudentAssignment(studentId, assignmentId);
        AssignmentAttachmentStorage storage = attachmentStorageProvider.getIfAvailable();
        if (storage == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_NOT_CONFIGURED",
                    "Chức năng tải tệp chưa được kết nối kho lưu trữ.");
        }
        Instant now = clock.instant();
        SubmissionStatus status = now.isAfter(assignment.getDueAt()) ? SubmissionStatus.LATE : SubmissionStatus.ON_TIME;
        Optional<AssignmentSubmission> existingSubmission = submissions.findByAssignmentIdAndStudentId(assignmentId, studentId);
        AssignmentSubmission submission = existingSubmission
                .orElseGet(() -> new AssignmentSubmission(UUID.randomUUID(), assignmentId, studentId, cleanText, now, status));
        long totalBytes = 0;
        List<AttachmentFileValidator.ValidatedAttachment> metadata = new ArrayList<>();
        try {
            for (MultipartFile file : uploadedFiles) {
                AttachmentFileValidator.ValidatedAttachment validated = AttachmentFileValidator.validate(file);
                totalBytes += validated.sizeBytes();
                if (totalBytes > 25L * 1024 * 1024) {
                    throw new ValidationException("ATTACHMENT_TOTAL_TOO_LARGE", "Tổng dung lượng tệp không vượt quá 25 MB.");
                }
                metadata.add(validated);
            }
        } catch (IOException exception) {
            throw new ValidationException("ATTACHMENT_READ_FAILED", "Không thể đọc tệp đính kèm.");
        }

        List<String> uploadedKeys = new ArrayList<>();
        try {
            for (int i = 0; i < uploadedFiles.size(); i++) {
                MultipartFile file = uploadedFiles.get(i);
                AttachmentFileValidator.ValidatedAttachment info = metadata.get(i);
                String objectKey = "assignment-submissions/" + assignmentId + "/" + submission.getId()
                        + "/" + UUID.randomUUID();
                uploadedKeys.add(objectKey);
                try (InputStream input = file.getInputStream()) {
                    storage.put(objectKey, info.contentType(), input, info.sizeBytes());
                }
            }
        } catch (IOException | RuntimeException exception) {
            uploadedKeys.forEach(key -> { try { storage.delete(key); } catch (RuntimeException ignored) { } });
            if (exception instanceof ApiException apiException) throw apiException;
            throw new ApiException(HttpStatus.BAD_GATEWAY, "ATTACHMENT_STORAGE_FAILED",
                    "Không thể lưu tệp đính kèm. Vui lòng thử lại.");
        }
        registerRollbackCleanup(storage, uploadedKeys);
        if (existingSubmission.isPresent()) {
            submission.resubmit(cleanText, now, status);
        }
        submission = submissions.save(submission);
        queueReplacedAttachments(submission.getId(), now);
        for (int i = 0; i < uploadedFiles.size(); i++) {
            AttachmentFileValidator.ValidatedAttachment info = metadata.get(i);
            attachments.save(new AssignmentSubmissionAttachment(UUID.randomUUID(), submission.getId(),
                    info.fileName(), info.contentType(), info.sizeBytes(), uploadedKeys.get(i), now));
        }
        return submission;
    }

    /**
     * Args: current submission ID and replacement time, both required. Input: the submission's committed
     * attachment rows inside the current write transaction. Output: void; removes old metadata and queues
     * private objects for retryable deletion after commit. Errors: database failure rolls back replacement.
     */
    private void queueReplacedAttachments(UUID submissionId, Instant now) {
        List<AssignmentSubmissionAttachment> oldFiles = attachments.findBySubmissionIdOrderByCreatedAt(submissionId);
        if (oldFiles.isEmpty()) return;
        attachments.deleteAll(oldFiles);
        for (AssignmentSubmissionAttachment oldFile : oldFiles) {
            attachmentCleanup.enqueue(oldFile.getStorageKey(), now);
        }
    }

    private static void registerRollbackCleanup(AssignmentAttachmentStorage storage, List<String> objectKeys) {
        if (!TransactionSynchronizationManager.isSynchronizationActive() || objectKeys.isEmpty()) return;
        List<String> keys = List.copyOf(objectKeys);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != TransactionSynchronization.STATUS_COMMITTED) {
                    keys.forEach(key -> { try { storage.delete(key); } catch (RuntimeException ignored) { } });
                }
            }
        });
    }

    /** Returns safe attachment metadata for a submission; storage keys are never returned. */
    @Transactional(readOnly = true)
    public List<AssignmentResponses.Attachment> listAttachments(UUID submissionId) {
        return attachments.findBySubmissionIdOrderByCreatedAt(submissionId).stream()
                .map(AssignmentResponses.Attachment::from).toList();
    }

    /** Authorized download input; only private server-side object key is carried in this value. */
    public record AttachmentDownload(String fileName, String contentType, long sizeBytes, InputStream content) {}

    /** Returns attachment content after verifying Student ownership and approved class access. */
    @Transactional(readOnly = true)
    public AttachmentDownload downloadForStudent(UUID studentId, UUID assignmentId, UUID attachmentId) {
        CourseAssignment assignment = requireStudentAssignment(studentId, assignmentId);
        AssignmentSubmission submission = submissions.findByAssignmentIdAndStudentId(assignment.getId(), studentId)
                .orElseThrow(() -> new ResourceNotFoundException("SUBMISSION_NOT_FOUND", "Không tìm thấy bài nộp."));
        return loadAttachment(submission.getId(), attachmentId);
    }

    /** Returns attachment content after verifying Teacher ownership of its class. */
    @Transactional(readOnly = true)
    public AttachmentDownload downloadForTeacher(UUID teacherId, UUID assignmentId, UUID studentId, UUID attachmentId) {
        requireOwnedAssignment(teacherId, assignmentId);
        AssignmentSubmission submission = submissions.findByAssignmentIdAndStudentId(assignmentId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("SUBMISSION_NOT_FOUND", "Không tìm thấy bài nộp."));
        return loadAttachment(submission.getId(), attachmentId);
    }

    private AttachmentDownload loadAttachment(UUID submissionId, UUID attachmentId) {
        AssignmentSubmissionAttachment file = attachments.findByIdAndSubmissionId(attachmentId, submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("ATTACHMENT_NOT_FOUND", "Không tìm thấy tệp đính kèm."));
        AssignmentAttachmentStorage storage = attachmentStorageProvider.getIfAvailable();
        if (storage == null) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_NOT_CONFIGURED", "Kho lưu trữ chưa sẵn sàng.");
        return new AttachmentDownload(file.getOriginalFileName(), file.getContentType(), file.getSizeBytes(), storage.get(file.getStorageKey()));
    }

    /**
     * Returns every approved Student and whether they submitted, for teacher-owned assignment.
     * Args: teacherId and assignmentId. Input is restricted to the assignment's owning class.
     * Output: three category counts and named currently approved students, regardless of approval time.
     * Students approved after dueAt without a submission are counted as NOT_SUBMITTED.
     * Errors: 404 missing, 403 non-owner.
     * Side effect: none. Does not infer or expose unrelated student progress.
     */
    @Transactional(readOnly = true)
    public AssignmentResponses.AssignmentStats stats(UUID teacherId, UUID assignmentId) {
        CourseAssignment assignment = requireOwnedAssignment(teacherId, assignmentId);
        List<CourseEnrollment> approved = enrollments.findByCourseOfferingIdAndStatus(
                assignment.getCourseOfferingId(), EnrollmentStatus.APPROVED);
        Map<UUID, AssignmentSubmission> submittedByStudent = submissions.findByAssignmentId(assignmentId).stream()
                .collect(Collectors.toMap(AssignmentSubmission::getStudentId, Function.identity(), (a, b) -> a));
        Map<UUID, UserAccount> accounts = users.findAllByIdIn(approved.stream()
                        .map(CourseEnrollment::getStudentId).toList()).stream()
                .collect(Collectors.toMap(UserAccount::id, Function.identity(), (a, b) -> a));
        List<AssignmentResponses.StudentResult> results = new ArrayList<>();
        for (CourseEnrollment enrollment : approved) {
            UUID studentId = enrollment.getStudentId();
            UserAccount account = accounts.get(studentId);
            AssignmentSubmission submission = submittedByStudent.get(studentId);
            results.add(new AssignmentResponses.StudentResult(studentId,
                    account == null ? "" : account.fullName(), account == null ? "" : account.email(),
                    submission == null ? "NOT_SUBMITTED" : "SUBMITTED",
                    submission == null ? null : submission.getSubmittedAt(),
                    submission == null ? null : submission.getStatus(),
                    submission == null ? null : submission.getAnswerText(),
                    submission == null ? List.of() : listAttachments(submission.getId())));
        }
        long submitted = results.stream().filter(result -> "SUBMITTED".equals(result.submissionState())).count();
        long onTime = results.stream().filter(result -> result.status() == SubmissionStatus.ON_TIME).count();
        long late = results.stream().filter(result -> result.status() == SubmissionStatus.LATE).count();
        return new AssignmentResponses.AssignmentStats(assignmentId, assignment.getTitle(), assignment.getDueAt(),
                results.size(), submitted, onTime, late, results.size() - submitted, results);
    }

    /**
     * Creates idempotent reminders before the deadline only for approved Students without a submission.
     * Args/input: current app data and injected clock; no external user input. Output: processed assignment count.
     * Errors: persistence exceptions propagate for scheduled retry. Side effect: notifications and reminder marker.
     */
    @Transactional
    public int generateDueReminders() {
        Instant now = clock.instant();
        int processed = 0;
        for (CourseAssignment assignment : assignments.findByStatusAndReminderAtLessThanEqualAndReminderSentAtIsNull(
                AssignmentStatus.PUBLISHED, now).stream().limit(REMINDER_BATCH_SIZE).toList()) {
            if (assignment.getDueAt().isAfter(now)) {
                Set<UUID> submittedStudentIds = submissions.findByAssignmentId(assignment.getId()).stream()
                        .map(AssignmentSubmission::getStudentId).collect(Collectors.toSet());
                for (CourseEnrollment enrollment : enrollments.findByCourseOfferingIdAndStatus(
                        assignment.getCourseOfferingId(), EnrollmentStatus.APPROVED)) {
                    if (!submittedStudentIds.contains(enrollment.getStudentId())) {
                        notifications.createAssignmentDeadlineReminderIfAbsent(enrollment.getStudentId(), assignment.getId(),
                                assignment.getTitle(), assignment.getDueAt(), now);
                    }
                }
            }
            assignment.markReminderSent(now);
            assignments.save(assignment);
            processed++;
        }
        return processed;
    }

    private CourseAssignment requireOwnedAssignment(UUID teacherId, UUID assignmentId) {
        CourseAssignment assignment = assignments.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập."));
        requireOwnedOffering(teacherId, assignment.getCourseOfferingId());
        return assignment;
    }

    private AssignmentResponses.Submission submissionResponse(AssignmentSubmission submission) {
        return AssignmentResponses.Submission.from(submission,
                attachments.findBySubmissionIdOrderByCreatedAt(submission.getId()).stream()
                        .map(AssignmentResponses.Attachment::from).toList());
    }

    private CourseAssignment requireStudentAssignment(UUID studentId, UUID assignmentId) {
        CourseAssignment assignment = assignments.findById(assignmentId)
                .filter(item -> item.getStatus() == AssignmentStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập đã công bố."));
        if (!enrollments.findByCourseOfferingIdAndStudentId(assignment.getCourseOfferingId(), studentId)
                .filter(CourseEnrollment::isApproved).isPresent()) {
            throw new ForbiddenException("ENROLLMENT_REQUIRED", "Chỉ sinh viên đã được duyệt vào lớp mới được truy cập bài tập.");
        }
        CourseOffering offering = offerings.findById(assignment.getCourseOfferingId())
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ConflictException("COURSE_NOT_ACTIVE", "Lớp học phần đã đóng hoặc không hoạt động.");
        }
        return assignment;
    }

    private CourseOffering requireOwnedOffering(UUID teacherId, UUID offeringId) {
        CourseOffering offering = offerings.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Chỉ giảng viên sở hữu lớp mới quản lý được bài tập.");
        }
        return offering;
    }

    private static void validateDueAt(Instant dueAt, Instant now) {
        if (dueAt == null || !dueAt.isAfter(now)) {
            throw new ValidationException("INVALID_DUE_AT", "Hạn nộp phải ở thời điểm trong tương lai.");
        }
    }
}
