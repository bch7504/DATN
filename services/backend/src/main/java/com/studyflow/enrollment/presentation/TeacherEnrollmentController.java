package com.studyflow.enrollment.presentation;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.enrollment.application.CourseEnrollmentService;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.enrollment.dto.BatchApproveRequest;
import com.studyflow.enrollment.dto.DecisionEnrollmentRequest;
import com.studyflow.enrollment.dto.TeacherEnrollmentResponse;
import com.studyflow.user.domain.UserAccount;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherEnrollmentController {

    private final CourseEnrollmentService enrollmentService;
    private final UserAccountStore userAccountStore;

    public TeacherEnrollmentController(CourseEnrollmentService enrollmentService, UserAccountStore userAccountStore) {
        this.enrollmentService = enrollmentService;
        this.userAccountStore = userAccountStore;
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
        }
    }

    @GetMapping("/course-offerings/{offeringId}/enrollments")
    public ResponseEntity<List<TeacherEnrollmentResponse>> getEnrollments(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("offeringId") UUID offeringId,
            @RequestParam(value = "status", required = false) EnrollmentStatus status) {
        UUID teacherId = userId(jwt);
        List<CourseEnrollment> enrollments = enrollmentService.getTeacherEnrollments(teacherId, offeringId, status);

        List<UUID> studentIds = enrollments.stream().map(CourseEnrollment::getStudentId).collect(Collectors.toList());
        Map<UUID, UserAccount> userMap = userAccountStore.findAllByIdIn(studentIds).stream()
                .collect(Collectors.toMap(UserAccount::id, u -> u, (u1, u2) -> u1));

        List<TeacherEnrollmentResponse> responses = enrollments.stream()
                .map(e -> TeacherEnrollmentResponse.fromEntity(e, userMap.get(e.getStudentId())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @PostMapping("/enrollments/{enrollmentId}/approve")
    public ResponseEntity<TeacherEnrollmentResponse> approveEnrollment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("enrollmentId") UUID enrollmentId) {
        UUID teacherId = userId(jwt);
        CourseEnrollment approved = enrollmentService.approveEnrollment(teacherId, enrollmentId);
        UserAccount student = userAccountStore.findById(approved.getStudentId()).orElse(null);
        return ResponseEntity.ok(TeacherEnrollmentResponse.fromEntity(approved, student));
    }

    @PostMapping("/enrollments/{enrollmentId}/reject")
    public ResponseEntity<TeacherEnrollmentResponse> rejectEnrollment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("enrollmentId") UUID enrollmentId,
            @RequestBody(required = false) DecisionEnrollmentRequest req) {
        UUID teacherId = userId(jwt);
        String reason = req != null ? req.getReason() : null;
        CourseEnrollment rejected = enrollmentService.rejectEnrollment(teacherId, enrollmentId, reason);
        UserAccount student = userAccountStore.findById(rejected.getStudentId()).orElse(null);
        return ResponseEntity.ok(TeacherEnrollmentResponse.fromEntity(rejected, student));
    }

    @PostMapping("/enrollments/approve-batch")
    public ResponseEntity<List<TeacherEnrollmentResponse>> approveBatch(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody BatchApproveRequest req) {
        UUID teacherId = userId(jwt);
        List<CourseEnrollment> approvedList = enrollmentService.approveBatch(teacherId, req.getCourseOfferingId(), req.getEnrollmentIds());

        List<UUID> studentIds = approvedList.stream().map(CourseEnrollment::getStudentId).collect(Collectors.toList());
        Map<UUID, UserAccount> userMap = userAccountStore.findAllByIdIn(studentIds).stream()
                .collect(Collectors.toMap(UserAccount::id, u -> u, (u1, u2) -> u1));

        List<TeacherEnrollmentResponse> responses = approvedList.stream()
                .map(e -> TeacherEnrollmentResponse.fromEntity(e, userMap.get(e.getStudentId())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @PostMapping("/enrollments/{enrollmentId}/remove")
    public ResponseEntity<TeacherEnrollmentResponse> removeStudent(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("enrollmentId") UUID enrollmentId,
            @RequestBody(required = false) DecisionEnrollmentRequest req) {
        UUID teacherId = userId(jwt);
        String reason = req != null ? req.getReason() : null;
        CourseEnrollment removed = enrollmentService.removeStudent(teacherId, enrollmentId, reason);
        UserAccount student = userAccountStore.findById(removed.getStudentId()).orElse(null);
        return ResponseEntity.ok(TeacherEnrollmentResponse.fromEntity(removed, student));
    }
}
