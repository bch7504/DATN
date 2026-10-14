package com.studyflow.enrollment.application;

import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.common.util.JoinCodeUtils;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseEnrollmentServiceTest {

    @Mock
    private CourseEnrollmentRepository enrollmentRepository;

    @Mock
    private CourseOfferingRepository offeringRepository;

    private CourseEnrollmentService enrollmentService;

    private CourseOffering mockOffering;
    private final String rawCode = "INT1340-ABCD12";
    private String codeHash;

    @BeforeEach
    void setUp() {
        enrollmentService = new CourseEnrollmentService(enrollmentRepository, offeringRepository);
        codeHash = JoinCodeUtils.sha256Hex(rawCode);

        mockOffering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "teacher_01",
                "DBI-01", "Cơ sở dữ liệu", codeHash, "CD12"
        );
    }

    @Test
    @DisplayName("Should create PENDING enrollment when student joins with valid code")
    void shouldCreatePendingEnrollment() {
        when(offeringRepository.findByJoinCodeHash(codeHash)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId("off_01", "student_01"))
                .thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenAnswer(inv -> inv.getArgument(0));

        CourseEnrollment result = enrollmentService.joinByCode("student_01", rawCode);

        assertNotNull(result);
        assertEquals("off_01", result.getCourseOfferingId());
        assertEquals("student_01", result.getStudentId());
        assertEquals(EnrollmentStatus.PENDING, result.getStatus());
        assertNotNull(result.getRequestedAt());

        verify(enrollmentRepository, times(1)).save(any(CourseEnrollment.class));
    }

    @Test
    @DisplayName("Should return existing enrollment idempotently when already PENDING")
    void shouldReturnIdempotentlyWhenPending() {
        CourseEnrollment existing = new CourseEnrollment("enr_01", "off_01", "student_01");
        when(offeringRepository.findByJoinCodeHash(codeHash)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId("off_01", "student_01"))
                .thenReturn(Optional.of(existing));

        CourseEnrollment result = enrollmentService.joinByCode("student_01", rawCode);

        assertSame(existing, result);
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject join request when student is already APPROVED")
    void shouldRejectWhenAlreadyApproved() {
        CourseEnrollment existing = new CourseEnrollment("enr_01", "off_01", "student_01");
        existing.approve("teacher_01");

        when(offeringRepository.findByJoinCodeHash(codeHash)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId("off_01", "student_01"))
                .thenReturn(Optional.of(existing));

        ConflictException ex = assertThrows(ConflictException.class, () ->
                enrollmentService.joinByCode("student_01", rawCode)
        );
        assertEquals("ENROLLMENT_ALREADY_APPROVED", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should reapply when student was previously REJECTED")
    void shouldReapplyWhenRejected() {
        CourseEnrollment existing = new CourseEnrollment("enr_01", "off_01", "student_01");
        existing.reject("teacher_01", "Chưa đủ điều kiện");

        when(offeringRepository.findByJoinCodeHash(codeHash)).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findByCourseOfferingIdAndStudentId("off_01", "student_01"))
                .thenReturn(Optional.of(existing));
        when(enrollmentRepository.save(existing)).thenReturn(existing);

        CourseEnrollment result = enrollmentService.joinByCode("student_01", rawCode);

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
                enrollmentService.joinByCode("student_01", rawCode)
        );
        assertEquals("JOIN_DISABLED", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should throw 404 when join code does not match any offering")
    void shouldThrowWhenJoinCodeNotFound() {
        when(offeringRepository.findByJoinCodeHash(anyString())).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
                enrollmentService.joinByCode("student_01", "WRONG-CODE")
        );
        assertEquals("JOIN_CODE_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should approve enrollment when teacher is the class owner")
    void shouldApproveEnrollment() {
        CourseEnrollment enrollment = new CourseEnrollment("enr_01", "off_01", "student_01");
        when(enrollmentRepository.findById("enr_01")).thenReturn(Optional.of(enrollment));
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.save(enrollment)).thenReturn(enrollment);

        CourseEnrollment result = enrollmentService.approveEnrollment("teacher_01", "enr_01");

        assertEquals(EnrollmentStatus.APPROVED, result.getStatus());
        assertEquals("teacher_01", result.getDecidedBy());
        assertNotNull(result.getDecidedAt());
        verify(enrollmentRepository, times(1)).save(enrollment);
    }

    @Test
    @DisplayName("Should forbid other teacher from approving enrollment")
    void shouldForbidNonOwnerFromApproving() {
        CourseEnrollment enrollment = new CourseEnrollment("enr_01", "off_01", "student_01");
        when(enrollmentRepository.findById("enr_01")).thenReturn(Optional.of(enrollment));
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(mockOffering));

        assertThrows(ForbiddenException.class, () ->
                enrollmentService.approveEnrollment("intruder_teacher", "enr_01")
        );
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject enrollment with reason")
    void shouldRejectEnrollmentWithReason() {
        CourseEnrollment enrollment = new CourseEnrollment("enr_01", "off_01", "student_01");
        when(enrollmentRepository.findById("enr_01")).thenReturn(Optional.of(enrollment));
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.save(enrollment)).thenReturn(enrollment);

        CourseEnrollment result = enrollmentService.rejectEnrollment("teacher_01", "enr_01", "Không đúng chuyên ngành");

        assertEquals(EnrollmentStatus.REJECTED, result.getStatus());
        assertEquals("Không đúng chuyên ngành", result.getDecisionNote());
        verify(enrollmentRepository, times(1)).save(enrollment);
    }

    @Test
    @DisplayName("Should approve batch enrollments")
    void shouldApproveBatch() {
        CourseEnrollment enr1 = new CourseEnrollment("enr_01", "off_01", "student_01");
        CourseEnrollment enr2 = new CourseEnrollment("enr_02", "off_01", "student_02");

        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findAllById(List.of("enr_01", "enr_02"))).thenReturn(List.of(enr1, enr2));
        when(enrollmentRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<CourseEnrollment> results = enrollmentService.approveBatch("teacher_01", "off_01", List.of("enr_01", "enr_02"));

        assertEquals(2, results.size());
        assertEquals(EnrollmentStatus.APPROVED, enr1.getStatus());
        assertEquals(EnrollmentStatus.APPROVED, enr2.getStatus());
    }

    @Test
    @DisplayName("Should reject batch approval when an enrollment is missing")
    void shouldRejectBatchWhenEnrollmentIsMissing() {
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findAllById(List.of("enr_01", "missing")))
                .thenReturn(List.of(new CourseEnrollment("enr_01", "off_01", "student_01")));

        ValidationException ex = assertThrows(ValidationException.class, () ->
                enrollmentService.approveBatch("teacher_01", "off_01", List.of("enr_01", "missing"))
        );

        assertEquals("INVALID_ENROLLMENT_BATCH", ex.getErrorCode());
        verify(enrollmentRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("Should reject batch approval when a request is not pending")
    void shouldRejectBatchWhenEnrollmentIsNotPending() {
        CourseEnrollment rejected = new CourseEnrollment("enr_01", "off_01", "student_01");
        rejected.reject("teacher_01", "Không đủ điều kiện");
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(mockOffering));
        when(enrollmentRepository.findAllById(List.of("enr_01"))).thenReturn(List.of(rejected));

        ValidationException ex = assertThrows(ValidationException.class, () ->
                enrollmentService.approveBatch("teacher_01", "off_01", List.of("enr_01"))
        );

        assertEquals("INVALID_ENROLLMENT_BATCH", ex.getErrorCode());
        verify(enrollmentRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("Should reject approving a rejected enrollment through the single-item flow")
    void shouldRejectApprovalFromRejectedState() {
        CourseEnrollment rejected = new CourseEnrollment("enr_01", "off_01", "student_01");
        rejected.reject("teacher_01", "Không đủ điều kiện");
        when(enrollmentRepository.findById("enr_01")).thenReturn(Optional.of(rejected));
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(mockOffering));

        assertThrows(IllegalStateException.class, () ->
                enrollmentService.approveEnrollment("teacher_01", "enr_01")
        );
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should query student enrollments by semester without scanning all offerings")
    void shouldFilterStudentEnrollmentsBySemester() {
        CourseOffering semesterOffering = new CourseOffering(
                "off_sem", "subj_dbi", "sem_2026_1", "teacher_01",
                "DBI-01", "CSDL", "hash_sem", "HSEM"
        );
        CourseEnrollment enrollment = new CourseEnrollment("enr_sem", "off_sem", "student_01");
        when(offeringRepository.findBySemesterId("sem_2026_1")).thenReturn(List.of(semesterOffering));
        when(enrollmentRepository.findByStudentIdAndStatusAndCourseOfferingIdIn(
                "student_01", EnrollmentStatus.PENDING, List.of("off_sem")))
                .thenReturn(List.of(enrollment));

        List<CourseEnrollment> result = enrollmentService.getStudentEnrollments(
                "student_01", "sem_2026_1", EnrollmentStatus.PENDING
        );

        assertEquals(List.of(enrollment), result);
        verify(enrollmentRepository).findByStudentIdAndStatusAndCourseOfferingIdIn(
                "student_01", EnrollmentStatus.PENDING, List.of("off_sem"));
        verify(enrollmentRepository, never()).findByStudentIdAndStatus("student_01", EnrollmentStatus.PENDING);
    }
}
