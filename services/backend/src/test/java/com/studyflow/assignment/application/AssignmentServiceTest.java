package com.studyflow.assignment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;

import com.studyflow.assignment.api.AssignmentRequests;
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
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
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
    private AssignmentService service;

    @BeforeEach
    void setUp() {
        service = new AssignmentService(assignments, submissions, offerings, enrollments, users,
                notifications, Clock.fixed(NOW, ZoneOffset.UTC), attachments, attachmentStorageProvider);
        when(offerings.findById(OFFERING_ID)).thenReturn(Optional.of(ownedOffering()));
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
        when(attachments.countBySubmissionId(any())).thenReturn(0L);
        when(attachments.save(any(AssignmentSubmissionAttachment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssignmentSubmission result = service.submitAttachments(studentId, ASSIGNMENT_ID, null, java.util.List.of(image));

        assertThat(result.getAnswerText()).isNull();
        assertThat(result.getStudentId()).isEqualTo(studentId);
        verify(attachmentStorage).put(any(String.class), eq("image/png"), any(InputStream.class), eq(image.getSize()));
        verify(attachments).save(any(AssignmentSubmissionAttachment.class));
    }

    private static CourseOffering ownedOffering() {
        return new CourseOffering(OFFERING_ID, UUID.randomUUID(), UUID.randomUUID(), TEACHER_ID,
                "CS101", "Lớp kiểm thử", null, null);
    }
}
