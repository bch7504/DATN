package com.studyflow.assignment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.doThrow;

import com.studyflow.assignment.api.AssignmentRequests;
import com.studyflow.assignment.api.AssignmentResponses;
import com.studyflow.assignment.domain.AssignmentStatus;
import com.studyflow.assignment.domain.CourseAssignment;
import com.studyflow.assignment.domain.CourseAssignmentRepository;
import com.studyflow.assignment.domain.AssignmentSubmissionRepository;
import com.studyflow.assignment.domain.AssignmentSubmissionAttachmentRepository;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.notification.application.port.NotificationStore;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import java.io.InputStream;
import org.springframework.mock.web.MockMultipartFile;
import com.studyflow.assignment.domain.AssignmentSubmission;
import com.studyflow.assignment.domain.AssignmentSubmissionAttachment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.springframework.beans.factory.ObjectProvider;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AssignmentServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-14T10:00:00Z");
    private static final UUID TEACHER_ID = UUID.randomUUID();
    private static final UUID OFFERING_ID = UUID.randomUUID();
    private static final UUID ASSIGNMENT_ID = UUID.randomUUID();

    @Mock private CourseAssignmentRepository assignments;
    @Mock private AssignmentSubmissionRepository submissions;
    @Mock private AssignmentSubmissionAttachmentRepository attachments;
    @Mock private ObjectProvider<AssignmentAttachmentStorage> attachmentStorageProvider;
    @Mock private AssignmentAttachmentStorage attachmentStorage;
    @Mock private CourseOfferingRepository offerings;
    @Mock private CourseEnrollmentRepository enrollments;
    @Mock private UserAccountStore users;
    @Mock private NotificationStore notifications;
    @Mock private AttachmentCleanupQueue attachmentCleanup;
    private AssignmentService service;

    @BeforeEach
    void setUp() {
        service = new AssignmentService(assignments, submissions, offerings, enrollments, users,
                notifications, Clock.fixed(NOW, ZoneOffset.UTC), attachments, attachmentStorageProvider,
                attachmentCleanup);
        lenient().when(offerings.findById(OFFERING_ID)).thenReturn(Optional.of(ownedOffering()));
    }

    @Test
    void createsFutureDueDraftAndSetsReminderBeforeDeadline() {
        when(assignments.save(any(CourseAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CourseAssignment created = service.createDraft(TEACHER_ID, OFFERING_ID,
                new AssignmentRequests.CreateDraft("  Bài 1  ", "  Nội dung  ", NOW.plusSeconds(172800)));

        assertThat(created.getStatus()).isEqualTo(AssignmentStatus.DRAFT);
        assertThat(created.getTitle()).isEqualTo("Bài 1");
        assertThat(created.getReminderAt()).isEqualTo(NOW.plusSeconds(86400));
    }

    @Test
    void rejectsDeadlineInThePast() {
        assertThatThrownBy(() -> service.createDraft(TEACHER_ID, OFFERING_ID,
                new AssignmentRequests.CreateDraft("Bài 1", "Nội dung", NOW)))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void publishingNotifiesOnlyApprovedStudents() {
        CourseAssignment draft = new CourseAssignment(ASSIGNMENT_ID, OFFERING_ID, TEACHER_ID,
                "Bài 1", "Nội dung", NOW.plusSeconds(3600), NOW, NOW.minusSeconds(30));
        CourseEnrollment approved = new CourseEnrollment(UUID.randomUUID(), OFFERING_ID, UUID.randomUUID());
        approved.setStatus(EnrollmentStatus.APPROVED);
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(draft));
        when(assignments.save(draft)).thenAnswer(invocation -> invocation.getArgument(0));
        when(enrollments.findByCourseOfferingIdAndStatus(OFFERING_ID, EnrollmentStatus.APPROVED))
                .thenReturn(java.util.List.of(approved));

        CourseAssignment published = service.publish(TEACHER_ID, ASSIGNMENT_ID);

        assertThat(published.getStatus()).isEqualTo(AssignmentStatus.PUBLISHED);
        verify(notifications).createAssignmentPublishedIfAbsent(approved.getStudentId(), ASSIGNMENT_ID,
                "Bài 1", NOW.plusSeconds(3600), NOW);
    }

    @Test
    void acceptsImageSubmissionAndStoresOnlyGeneratedPrivateKey() throws Exception {
        UUID studentId = UUID.randomUUID();
        CourseAssignment published = new CourseAssignment(ASSIGNMENT_ID, OFFERING_ID, TEACHER_ID,
                "Bài ảnh", "Nộp ảnh", NOW.plusSeconds(3600), NOW, NOW.minusSeconds(60));
        published.publish(NOW.minusSeconds(30));
        CourseEnrollment approved = new CourseEnrollment(UUID.randomUUID(), OFFERING_ID, studentId);
        approved.setStatus(EnrollmentStatus.APPROVED);
        MockMultipartFile image = new MockMultipartFile("files", "bai-lam.png", "image/png",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 1});
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(published));
        when(enrollments.findByCourseOfferingIdAndStudentId(OFFERING_ID, studentId)).thenReturn(Optional.of(approved));
        when(submissions.findByAssignmentIdAndStudentId(ASSIGNMENT_ID, studentId)).thenReturn(Optional.empty());
        when(submissions.save(any(AssignmentSubmission.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(offerings.findById(OFFERING_ID)).thenReturn(Optional.of(ownedOffering()));
        when(attachmentStorageProvider.getIfAvailable()).thenReturn(attachmentStorage);
        when(attachments.save(any(AssignmentSubmissionAttachment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssignmentSubmission result = service.submitAttachments(studentId, ASSIGNMENT_ID, null, java.util.List.of(image));

        assertThat(result.getAnswerText()).isNull();
        assertThat(result.getStudentId()).isEqualTo(studentId);
        verify(attachmentStorage).put(any(String.class), eq("image/png"), any(InputStream.class), eq(image.getSize()));
        verify(attachments).save(any(AssignmentSubmissionAttachment.class));
    }

    /** Args: none. Input: synthetic current submission with one old file. Output: latest text only; errors: assertions. */
    @Test
    void textResubmissionReplacesOldFile() {
        UUID studentId = UUID.randomUUID();
        CourseAssignment published = publishedAssignment();
        CourseEnrollment approved = approvedEnrollment(studentId);
        AssignmentSubmission existing = new AssignmentSubmission(UUID.randomUUID(), ASSIGNMENT_ID, studentId,
                "old answer", NOW.minusSeconds(120), com.studyflow.assignment.domain.SubmissionStatus.ON_TIME);
        AssignmentSubmissionAttachment oldFile = new AssignmentSubmissionAttachment(UUID.randomUUID(),
                existing.getId(), "old.pdf", "application/pdf", 5, "assignment-submissions/old-key", NOW.minusSeconds(120));
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(published));
        when(enrollments.findByCourseOfferingIdAndStudentId(OFFERING_ID, studentId)).thenReturn(Optional.of(approved));
        when(submissions.findByAssignmentIdAndStudentId(ASSIGNMENT_ID, studentId)).thenReturn(Optional.of(existing));
        when(submissions.save(existing)).thenReturn(existing);
        when(attachments.findBySubmissionIdOrderByCreatedAt(existing.getId()))
                .thenReturn(java.util.List.of(oldFile));

        AssignmentSubmission latest = service.submit(studentId, ASSIGNMENT_ID,
                new AssignmentRequests.SubmitAnswer("new answer"));

        assertThat(latest.getId()).isEqualTo(existing.getId());
        assertThat(latest.getAnswerText()).isEqualTo("new answer");
        verify(attachments).deleteAll(java.util.List.of(oldFile));
        verify(attachmentCleanup).enqueue("assignment-submissions/old-key", NOW);
    }

    /** Args: none. Input: synthetic old PDF and new PNG. Output: one current attachment; errors: assertions. */
    @Test
    void fileResubmissionReplacesOldAttachmentInsteadOfAccumulatingIt() throws Exception {
        UUID studentId = UUID.randomUUID();
        AssignmentSubmission existing = new AssignmentSubmission(UUID.randomUUID(), ASSIGNMENT_ID, studentId,
                "old answer", NOW.minusSeconds(120), com.studyflow.assignment.domain.SubmissionStatus.ON_TIME);
        AssignmentSubmissionAttachment oldFile = new AssignmentSubmissionAttachment(UUID.randomUUID(),
                existing.getId(), "old.pdf", "application/pdf", 5, "assignment-submissions/old-key", NOW.minusSeconds(120));
        MockMultipartFile image = new MockMultipartFile("files", "new.png", "image/png",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 1});
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(publishedAssignment()));
        when(enrollments.findByCourseOfferingIdAndStudentId(OFFERING_ID, studentId))
                .thenReturn(Optional.of(approvedEnrollment(studentId)));
        when(attachmentStorageProvider.getIfAvailable()).thenReturn(attachmentStorage);
        when(submissions.findByAssignmentIdAndStudentId(ASSIGNMENT_ID, studentId)).thenReturn(Optional.of(existing));
        when(submissions.save(existing)).thenReturn(existing);
        when(attachments.findBySubmissionIdOrderByCreatedAt(existing.getId()))
                .thenReturn(java.util.List.of(oldFile));
        when(attachments.save(any(AssignmentSubmissionAttachment.class))).thenAnswer(call -> call.getArgument(0));

        AssignmentSubmission latest = service.submitAttachments(studentId, ASSIGNMENT_ID, null, java.util.List.of(image));

        assertThat(latest.getId()).isEqualTo(existing.getId());
        assertThat(latest.getAnswerText()).isNull();
        verify(attachments).deleteAll(java.util.List.of(oldFile));
        verify(attachmentCleanup).enqueue("assignment-submissions/old-key", NOW);
        verify(attachments).save(any(AssignmentSubmissionAttachment.class));
        verify(attachmentStorage).put(any(String.class), eq("image/png"), any(InputStream.class), eq(image.getSize()));
    }

    /** Args: none. Input: invalid new upload. Output: rejection leaves old metadata untouched; errors: validation. */
    @Test
    void invalidReplacementLeavesOldAttachmentUntouched() {
        UUID studentId = UUID.randomUUID();
        MockMultipartFile invalid = new MockMultipartFile("files", "new.exe", "application/octet-stream", new byte[]{1});
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(publishedAssignment()));
        when(enrollments.findByCourseOfferingIdAndStudentId(OFFERING_ID, studentId))
                .thenReturn(Optional.of(approvedEnrollment(studentId)));
        when(attachmentStorageProvider.getIfAvailable()).thenReturn(attachmentStorage);
        when(submissions.findByAssignmentIdAndStudentId(ASSIGNMENT_ID, studentId))
                .thenReturn(Optional.of(new AssignmentSubmission(UUID.randomUUID(), ASSIGNMENT_ID, studentId,
                        "old answer", NOW.minusSeconds(120), com.studyflow.assignment.domain.SubmissionStatus.ON_TIME)));

        assertThatThrownBy(() -> service.submitAttachments(studentId, ASSIGNMENT_ID, null, java.util.List.of(invalid)))
                .isInstanceOf(ValidationException.class);

        verifyNoInteractions(attachmentCleanup);
        verify(attachments, org.mockito.Mockito.never()).deleteAll(any());
    }

    /** Args: none. Input: synthetic old answer and failing private-storage upload. Output: old answer/file remain current; errors: 502. */
    @Test
    void failedUploadDoesNotReplaceExistingSubmission() throws Exception {
        UUID studentId = UUID.randomUUID();
        AssignmentSubmission existing = new AssignmentSubmission(UUID.randomUUID(), ASSIGNMENT_ID, studentId,
                "old answer", NOW.minusSeconds(120), com.studyflow.assignment.domain.SubmissionStatus.ON_TIME);
        MockMultipartFile image = new MockMultipartFile("files", "new.png", "image/png",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 1});
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(publishedAssignment()));
        when(enrollments.findByCourseOfferingIdAndStudentId(OFFERING_ID, studentId))
                .thenReturn(Optional.of(approvedEnrollment(studentId)));
        when(attachmentStorageProvider.getIfAvailable()).thenReturn(attachmentStorage);
        when(submissions.findByAssignmentIdAndStudentId(ASSIGNMENT_ID, studentId)).thenReturn(Optional.of(existing));
        doThrow(new IllegalStateException("Synthetic storage outage")).when(attachmentStorage)
                .put(any(String.class), eq("image/png"), any(InputStream.class), eq(image.getSize()));

        assertThatThrownBy(() -> service.submitAttachments(studentId, ASSIGNMENT_ID, null, java.util.List.of(image)))
                .isInstanceOf(com.studyflow.common.exception.ApiException.class);

        assertThat(existing.getAnswerText()).isEqualTo("old answer");
        verifyNoInteractions(attachmentCleanup);
        verify(attachments, org.mockito.Mockito.never()).deleteAll(any());
    }

    /** Args: none. Input: three pre-deadline approvals and one later approval. Output: all current approvals in three categories. Errors: assertions. */
    @Test
    void afterDeadlineReportCountsLateApprovedStudentWithoutSubmissionAsMissing() {
        Instant dueAt = NOW.minusSeconds(60);
        CourseAssignment assignment = new CourseAssignment(ASSIGNMENT_ID, OFFERING_ID, TEACHER_ID,
                "Bài 1", "Nội dung", dueAt, dueAt.minusSeconds(86400), dueAt.minusSeconds(90000));
        assignment.publish(dueAt.minusSeconds(7200));
        UUID onTimeId = UUID.randomUUID();
        UUID lateId = UUID.randomUUID();
        UUID missingId = UUID.randomUUID();
        UUID approvedLateId = UUID.randomUUID();
        CourseEnrollment onTime = approvedEnrollment(onTimeId);
        CourseEnrollment late = approvedEnrollment(lateId);
        CourseEnrollment missing = approvedEnrollment(missingId);
        CourseEnrollment approvedLate = approvedEnrollment(approvedLateId);
        onTime.setDecidedAt(dueAt.minusSeconds(3600));
        late.setDecidedAt(dueAt.minusSeconds(3600));
        missing.setDecidedAt(dueAt.minusSeconds(3600));
        approvedLate.setDecidedAt(dueAt.plusSeconds(1));
        when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(assignment));
        when(enrollments.findByCourseOfferingIdAndStatus(OFFERING_ID, EnrollmentStatus.APPROVED))
                .thenReturn(java.util.List.of(onTime, late, missing, approvedLate));
        when(submissions.findByAssignmentId(ASSIGNMENT_ID)).thenReturn(java.util.List.of(
                new AssignmentSubmission(UUID.randomUUID(), ASSIGNMENT_ID, onTimeId, "on time", dueAt.minusSeconds(1),
                        com.studyflow.assignment.domain.SubmissionStatus.ON_TIME),
                new AssignmentSubmission(UUID.randomUUID(), ASSIGNMENT_ID, lateId, "late", dueAt.plusSeconds(1),
                        com.studyflow.assignment.domain.SubmissionStatus.LATE)));
        when(users.findAllByIdIn(any())).thenReturn(java.util.List.of());

        var report = service.stats(TEACHER_ID, ASSIGNMENT_ID);

        assertThat(report.approvedStudentCount()).isEqualTo(4);
        assertThat(report.submittedCount()).isEqualTo(2);
        assertThat(report.onTimeCount()).isEqualTo(1);
        assertThat(report.lateCount()).isEqualTo(1);
        assertThat(report.notSubmittedCount()).isEqualTo(2);
        assertThat(report.students()).extracting(AssignmentResponses.StudentResult::studentId)
                .contains(approvedLateId);
        assertThat(report.students()).filteredOn(result -> result.studentId().equals(approvedLateId))
                .extracting(AssignmentResponses.StudentResult::submissionState)
                .containsExactly("NOT_SUBMITTED");
    }

    /** Args: none. Input: one submitted and one missing approved Student. Output: only missing Student receives reminder. Errors: assertions. */
    @Test
    void deadlineReminderSkipsStudentsWhoAlreadySubmitted() {
        CourseAssignment assignment = new CourseAssignment(ASSIGNMENT_ID, OFFERING_ID, TEACHER_ID,
                "Bài 1", "Nội dung", NOW.plusSeconds(3600), NOW.minusSeconds(1), NOW.minusSeconds(60));
        assignment.publish(NOW.minusSeconds(30));
        UUID submittedId = UUID.randomUUID();
        UUID missingId = UUID.randomUUID();
        when(assignments.findByStatusAndReminderAtLessThanEqualAndReminderSentAtIsNull(
                AssignmentStatus.PUBLISHED, NOW)).thenReturn(java.util.List.of(assignment));
        when(submissions.findByAssignmentId(ASSIGNMENT_ID)).thenReturn(java.util.List.of(
                new AssignmentSubmission(UUID.randomUUID(), ASSIGNMENT_ID, submittedId, "answer", NOW.minusSeconds(60),
                        com.studyflow.assignment.domain.SubmissionStatus.ON_TIME)));
        when(enrollments.findByCourseOfferingIdAndStatus(OFFERING_ID, EnrollmentStatus.APPROVED))
                .thenReturn(java.util.List.of(approvedEnrollment(submittedId), approvedEnrollment(missingId)));

        assertThat(service.generateDueReminders()).isEqualTo(1);

        verify(notifications).createAssignmentDeadlineReminderIfAbsent(missingId, ASSIGNMENT_ID,
                "Bài 1", assignment.getDueAt(), NOW);
        verify(notifications, never()).createAssignmentDeadlineReminderIfAbsent(eq(submittedId), any(), any(), any(), any());
        assertThat(assignment.getReminderSentAt()).isEqualTo(NOW);
    }

    /** Args: none. Input: a scan delayed until after deadline. Output: no reminder is created. Errors: assertions. */
    @Test
    void delayedScanDoesNotSendReminderAfterDeadline() {
        Instant dueAt = NOW.minusSeconds(1);
        CourseAssignment assignment = new CourseAssignment(ASSIGNMENT_ID, OFFERING_ID, TEACHER_ID,
                "Bài 1", "Nội dung", dueAt, dueAt.minusSeconds(86400), dueAt.minusSeconds(90000));
        assignment.publish(dueAt.minusSeconds(3600));
        when(assignments.findByStatusAndReminderAtLessThanEqualAndReminderSentAtIsNull(
                AssignmentStatus.PUBLISHED, NOW)).thenReturn(java.util.List.of(assignment));

        assertThat(service.generateDueReminders()).isEqualTo(1);

        verifyNoInteractions(notifications);
        assertThat(assignment.getReminderSentAt()).isEqualTo(NOW);
    }

    private static CourseAssignment publishedAssignment() {
        CourseAssignment assignment = new CourseAssignment(ASSIGNMENT_ID, OFFERING_ID, TEACHER_ID,
                "Bài 1", "Nội dung", NOW.plusSeconds(3600), NOW, NOW.minusSeconds(60));
        assignment.publish(NOW.minusSeconds(30));
        return assignment;
    }

    private static CourseEnrollment approvedEnrollment(UUID studentId) {
        CourseEnrollment enrollment = new CourseEnrollment(UUID.randomUUID(), OFFERING_ID, studentId);
        enrollment.setStatus(EnrollmentStatus.APPROVED);
        return enrollment;
    }

    private static CourseOffering ownedOffering() {
        return new CourseOffering(OFFERING_ID, UUID.randomUUID(), UUID.randomUUID(), TEACHER_ID,
                "CS101", "Lớp kiểm thử", null, null);
    }
}
