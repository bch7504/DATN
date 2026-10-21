package com.studyflow.enrollment.application;

import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.util.JoinCodeUtils;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.notification.domain.NotificationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseEnrollmentServiceTest {

    private static final UUID STUDENT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER_STUDENT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID TEACHER_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID OTHER_TEACHER_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID SUBJECT_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID SEMESTER_ID = UUID.fromString("66666666-6666-6666-6666-666666666666");
    private static final UUID OFFERING_ID = UUID.fromString("77777777-7777-7777-7777-777777777777");
    private static final UUID ENROLLMENT_ID = UUID.fromString("88888888-8888-8888-8888-888888888888");
    private static final UUID ENROLLMENT_ID_2 = UUID.fromString("99999999-9999-9999-9999-999999999999");

    @Mock
    private CourseEnrollmentRepository enrollmentRepository;

    @Mock
    private CourseOfferingRepository offeringRepository;

    @Mock
    private NotificationStore notifications;

    private CourseEnrollmentService enrollmentService;

    private CourseOffering mockOffering;
    private final String rawCode = "INT1340-ABCD12";
    private String codeHash;

    @BeforeEach
    void setUp() {
        enrollmentService = new CourseEnrollmentService(enrollmentRepository, offeringRepository, notifications);
        codeHash = JoinCodeUtils.sha256Hex(rawCode);

        mockOffering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "Cơ sở dữ liệu", codeHash, "CD12"
        );
    }

    @Test
    @DisplayName("Should create PENDING enrollment when student joins with valid code")
    void shouldCreatePendingEnrollment() {
        when(offeringRepository.findByJoinCodeHash(codeHash)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID))
                .thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenAnswer(inv -> inv.getArgument(0));

        CourseEnrollment result = enrollmentService.joinByCode(STUDENT_ID, rawCode);

        assertNotNull(result);
        assertEquals(OFFERING_ID, result.getCourseOfferingId());
        assertEquals(STUDENT_ID, result.getStudentId());
        assertEquals(EnrollmentStatus.PENDING, result.getStatus());
        assertNotNull(result.getRequestedAt());

        verify(enrollmentRepository, times(1)).save(any(CourseEnrollment.class));
        verify(notifications).createTeacherEnrollmentRequestedIfAbsent(eq(TEACHER_ID), eq(result.getId()),
                eq(mockOffering.getName()), eq(result.getRequestedAt()));
        verify(notifications).createEventIfAbsent(eq(STUDENT_ID), eq(NotificationType.STUDENT_ENROLLMENT_REQUESTED),
                anyString(), anyString(), eq("COURSE_ENROLLMENT"), any(UUID.class), eq(null),
                eq(result.getRequestedAt()), eq(true));
    }

    @Test
    @DisplayName("Should return existing enrollment idempotently when already PENDING")
    void shouldReturnIdempotentlyWhenPending() {
        CourseEnrollment existing = new CourseEnrollment(ENROLLMENT_ID, OFFERING_ID, STUDENT_ID);
        when(offeringRepository.findByJoinCodeHash(codeHash)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID))
                .thenReturn(Optional.of(existing));

        CourseEnrollment result = enrollmentService.joinByCode(STUDENT_ID, rawCode);

        assertSame(existing, result);
        verify(enrollmentRepository, never()).save(any());
        verifyNoInteractions(notifications);
    }

    @Test
    @DisplayName("Should reject join request when student is already APPROVED")
    void shouldRejectWhenAlreadyApproved() {
        CourseEnrollment existing = new CourseEnrollment(ENROLLMENT_ID, OFFERING_ID, STUDENT_ID);
        existing.approve(TEACHER_ID);

        when(offeringRepository.findByJoinCodeHash(codeHash)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID))
                .thenReturn(Optional.of(existing));

        ConflictException ex = assertThrows(ConflictException.class, () ->
                enrollmentService.joinByCode(STUDENT_ID, rawCode)
        );
        assertEquals("ENROLLMENT_ALREADY_APPROVED", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should reapply when student was previously REJECTED")
    void shouldReapplyWhenRejected() {
        CourseEnrollment existing = new CourseEnrollment(ENROLLMENT_ID, OFFERING_ID, STUDENT_ID);
        existing.reject(TEACHER_ID, "Chưa đủ điều kiện");

        when(offeringRepository.findByJoinCodeHash(codeHash)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId(OFFERING_ID, STUDENT_ID))
                .thenReturn(Optional.of(existing));
        when(enrollmentRepository.save(existing)).thenReturn(existing);

        CourseEnrollment result = enrollmentService.joinByCode(STUDENT_ID, rawCode);

        assertEquals(EnrollmentStatus.PENDING, result.getStatus());
        assertNull(result.getDecisionNote());
        verify(enrollmentRepository, times(1)).save(existing);
    }

    @Test
    @DisplayName("Should reject join when teacher has disabled join requests")
    void shouldRejectWhenJoinDisabled() {
        mockOffering.toggleJoinCode(false);
        when(offeringRepository.findByJoinCodeHash(codeHash)).thenReturn(Optional.of(mockOffering));

        ConflictException ex = assertThrows(ConflictException.class, () ->
                enrollmentService.joinByCode(STUDENT_ID, rawCode)
        );
        assertEquals("JOIN_DISABLED", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should throw 404 when join code does not match any offering")
    void shouldThrowWhenJoinCodeNotFound() {
        when(offeringRepository.findByJoinCodeHash(anyString())).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
                enrollmentService.joinByCode(STUDENT_ID, "WRONG-CODE")
        );
        assertEquals("JOIN_CODE_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should approve enrollment when teacher is the class owner")
    void shouldApproveEnrollment() {
        CourseEnrollment enrollment = new CourseEnrollment(ENROLLMENT_ID, OFFERING_ID, STUDENT_ID);
        when(enrollmentRepository.findById(ENROLLMENT_ID)).thenReturn(Optional.of(enrollment));
        when(offeringRepository.findById(OFFERING_ID)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.save(enrollment)).thenReturn(enrollment);

        CourseEnrollment result = enrollmentService.approveEnrollment(TEACHER_ID, ENROLLMENT_ID);

        assertEquals(EnrollmentStatus.APPROVED, result.getStatus());
        assertEquals(TEACHER_ID, result.getDecidedBy());
        assertNotNull(result.getDecidedAt());
        verify(enrollmentRepository, times(1)).save(enrollment);
        verify(notifications).createEventIfAbsent(eq(STUDENT_ID), eq(NotificationType.STUDENT_ENROLLMENT_APPROVED),
                anyString(), anyString(), eq("COURSE_ENROLLMENT"), any(UUID.class), eq(null),
                eq(result.getDecidedAt()), eq(true));
    }

    @Test
    @DisplayName("Should forbid other teacher from approving enrollment")
    void shouldForbidNonOwnerFromApproving() {
        CourseEnrollment enrollment = new CourseEnrollment(ENROLLMENT_ID, OFFERING_ID, STUDENT_ID);
        when(enrollmentRepository.findById(ENROLLMENT_ID)).thenReturn(Optional.of(enrollment));
        when(offeringRepository.findById(OFFERING_ID)).thenReturn(Optional.of(mockOffering));

        assertThrows(ForbiddenException.class, () ->
                enrollmentService.approveEnrollment(OTHER_TEACHER_ID, ENROLLMENT_ID)
        );
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject enrollment with reason")
    void shouldRejectEnrollmentWithReason() {
        CourseEnrollment enrollment = new CourseEnrollment(ENROLLMENT_ID, OFFERING_ID, STUDENT_ID);
        when(enrollmentRepository.findById(ENROLLMENT_ID)).thenReturn(Optional.of(enrollment));
        when(offeringRepository.findById(OFFERING_ID)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.save(enrollment)).thenReturn(enrollment);

        CourseEnrollment result = enrollmentService.rejectEnrollment(TEACHER_ID, ENROLLMENT_ID, "Không đúng chuyên ngành");

        assertEquals(EnrollmentStatus.REJECTED, result.getStatus());
        assertEquals("Không đúng chuyên ngành", result.getDecisionNote());
        verify(enrollmentRepository, times(1)).save(enrollment);
        verify(notifications).createEventIfAbsent(eq(STUDENT_ID), eq(NotificationType.STUDENT_ENROLLMENT_REJECTED),
                anyString(), anyString(), eq("COURSE_ENROLLMENT"), any(UUID.class), eq(null),
                eq(result.getDecidedAt()), eq(true));
    }

    @Test
    @DisplayName("Should approve batch enrollments")
    void shouldApproveBatch() {
        CourseEnrollment enr1 = new CourseEnrollment(ENROLLMENT_ID, OFFERING_ID, STUDENT_ID);
        CourseEnrollment enr2 = new CourseEnrollment(ENROLLMENT_ID_2, OFFERING_ID, OTHER_STUDENT_ID);

        when(offeringRepository.findById(OFFERING_ID)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findAllById(List.of(ENROLLMENT_ID, ENROLLMENT_ID_2))).thenReturn(List.of(enr1, enr2));
        when(enrollmentRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<CourseEnrollment> results = enrollmentService.approveBatch(TEACHER_ID, OFFERING_ID, List.of(ENROLLMENT_ID, ENROLLMENT_ID_2));

        assertEquals(2, results.size());
        assertEquals(EnrollmentStatus.APPROVED, enr1.getStatus());
        assertEquals(EnrollmentStatus.APPROVED, enr2.getStatus());
        verify(enrollmentRepository, times(1)).saveAll(any());
    }
}
