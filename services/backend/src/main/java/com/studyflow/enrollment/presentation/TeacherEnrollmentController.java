package com.studyflow.enrollment.presentation;

import com.studyflow.common.security.SecurityUtils;
import com.studyflow.enrollment.application.CourseEnrollmentService;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.enrollment.dto.BatchApproveRequest;
import com.studyflow.enrollment.dto.DecisionEnrollmentRequest;
import com.studyflow.enrollment.dto.TeacherEnrollmentResponse;
import com.studyflow.user.domain.User;
import com.studyflow.user.domain.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherEnrollmentController {

    private final CourseEnrollmentService enrollmentService;
    private final UserRepository userRepository;

    public TeacherEnrollmentController(CourseEnrollmentService enrollmentService, UserRepository userRepository) {
        this.enrollmentService = enrollmentService;
        this.userRepository = userRepository;
    }

    @GetMapping("/course-offerings/{offeringId}/enrollments")
    public ResponseEntity<List<TeacherEnrollmentResponse>> getEnrollments(
            @PathVariable("offeringId") String offeringId,
            @RequestParam(value = "status", required = false) EnrollmentStatus status) {
        String teacherId = SecurityUtils.getCurrentUserId();
        List<CourseEnrollment> enrollments = enrollmentService.getTeacherEnrollments(teacherId, offeringId, status);

        List<String> studentIds = enrollments.stream().map(CourseEnrollment::getStudentId).collect(Collectors.toList());
        Map<String, User> userMap = userRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u, (u1, u2) -> u1));

        List<TeacherEnrollmentResponse> responses = enrollments.stream()
                .map(e -> TeacherEnrollmentResponse.fromEntity(e, userMap.get(e.getStudentId())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @PostMapping("/enrollments/{enrollmentId}/approve")
    public ResponseEntity<TeacherEnrollmentResponse> approveEnrollment(@PathVariable("enrollmentId") String enrollmentId) {
        String teacherId = SecurityUtils.getCurrentUserId();
        CourseEnrollment approved = enrollmentService.approveEnrollment(teacherId, enrollmentId);
        User student = userRepository.findById(approved.getStudentId()).orElse(null);
        return ResponseEntity.ok(TeacherEnrollmentResponse.fromEntity(approved, student));
    }

    @PostMapping("/enrollments/{enrollmentId}/reject")
    public ResponseEntity<TeacherEnrollmentResponse> rejectEnrollment(
            @PathVariable("enrollmentId") String enrollmentId,
            @RequestBody(required = false) DecisionEnrollmentRequest req) {
        String teacherId = SecurityUtils.getCurrentUserId();
        String reason = req != null ? req.getReason() : null;
        CourseEnrollment rejected = enrollmentService.rejectEnrollment(teacherId, enrollmentId, reason);
        User student = userRepository.findById(rejected.getStudentId()).orElse(null);
        return ResponseEntity.ok(TeacherEnrollmentResponse.fromEntity(rejected, student));
    }

    @PostMapping("/enrollments/approve-batch")
    public ResponseEntity<List<TeacherEnrollmentResponse>> approveBatch(@Valid @RequestBody BatchApproveRequest req) {
        String teacherId = SecurityUtils.getCurrentUserId();
        List<CourseEnrollment> approvedList = enrollmentService.approveBatch(teacherId, req.getCourseOfferingId(), req.getEnrollmentIds());

        List<String> studentIds = approvedList.stream().map(CourseEnrollment::getStudentId).collect(Collectors.toList());
        Map<String, User> userMap = userRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u, (u1, u2) -> u1));

        List<TeacherEnrollmentResponse> responses = approvedList.stream()
                .map(e -> TeacherEnrollmentResponse.fromEntity(e, userMap.get(e.getStudentId())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/enrollments/{enrollmentId}")
    public ResponseEntity<TeacherEnrollmentResponse> removeStudent(
            @PathVariable("enrollmentId") String enrollmentId,
            @RequestParam(value = "reason", required = false) String reason) {
        String teacherId = SecurityUtils.getCurrentUserId();
        CourseEnrollment removed = enrollmentService.removeStudent(teacherId, enrollmentId, reason);
        User student = userRepository.findById(removed.getStudentId()).orElse(null);
        return ResponseEntity.ok(TeacherEnrollmentResponse.fromEntity(removed, student));
    }
}
