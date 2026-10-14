package com.studyflow.enrollment.dto;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.Subject;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.user.domain.UserAccount;

import java.time.Instant;
import java.util.UUID;

public record StudentEnrollmentResponse(
        UUID id,
        UUID courseOfferingId,
        String courseCode,
        String courseName,
        String subjectName,
        String teacherName,
        EnrollmentStatus status,
        Instant requestedAt,
        Instant decidedAt,
        String decisionNote
) {
    public static StudentEnrollmentResponse from(CourseEnrollment enrollment,
                                                 CourseOffering offering,
                                                 String subjectName,
                                                 String teacherName) {
        return new StudentEnrollmentResponse(
                enrollment.getId(),
                enrollment.getCourseOfferingId(),
                offering != null ? offering.getCode() : null,
                offering != null ? offering.getName() : null,
                subjectName,
                teacherName,
                enrollment.getStatus(),
                enrollment.getRequestedAt(),
                enrollment.getDecidedAt(),
                enrollment.getDecisionNote()
        );
    }

    public static StudentEnrollmentResponse from(CourseEnrollment enrollment,
                                                 CourseOffering offering,
                                                 Subject subject,
                                                 Semester semester,
                                                 UserAccount teacher) {
        return from(
                enrollment,
                offering,
                subject != null ? subject.getName() : null,
                teacher != null ? teacher.fullName() : null
        );
    }
}
