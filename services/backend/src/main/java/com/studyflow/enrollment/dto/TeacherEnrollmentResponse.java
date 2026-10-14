package com.studyflow.enrollment.dto;

import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.user.domain.UserAccount;

import java.time.Instant;
import java.util.UUID;

public record TeacherEnrollmentResponse(
        UUID id,
        UUID courseOfferingId,
        UUID studentId,
        String studentName,
        String studentEmail,
        EnrollmentStatus status,
        Instant requestedAt,
        Instant decidedAt,
        String decisionNote
) {
    public static TeacherEnrollmentResponse from(CourseEnrollment enrollment,
                                                 String studentName,
                                                 String studentEmail) {
        return new TeacherEnrollmentResponse(
                enrollment.getId(),
                enrollment.getCourseOfferingId(),
                enrollment.getStudentId(),
                studentName,
                studentEmail,
                enrollment.getStatus(),
                enrollment.getRequestedAt(),
                enrollment.getDecidedAt(),
                enrollment.getDecisionNote()
        );
    }

    public static TeacherEnrollmentResponse fromEntity(CourseEnrollment enrollment, UserAccount student) {
        return from(
                enrollment,
                student != null ? student.fullName() : null,
                student != null ? student.email() : null
        );
    }
}
