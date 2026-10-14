package com.studyflow.courseoffering.dto;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.Subject;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.enrollment.domain.EnrollmentStatus;

import java.util.UUID;

public record StudentCourseOfferingResponse(
        UUID id,
        UUID subjectId,
        String subjectCode,
        String subjectName,
        int credits,
        UUID semesterId,
        String semesterName,
        UUID teacherId,
        String teacherName,
        String teacherEmail,
        String code,
        String name,
        CourseOfferingStatus status,
        EnrollmentStatus enrollmentStatus
) {
    public static StudentCourseOfferingResponse from(CourseOffering offering,
                                                     Subject subject,
                                                     Semester semester,
                                                     String teacherName,
                                                     String teacherEmail,
                                                     EnrollmentStatus enrollmentStatus) {
        return new StudentCourseOfferingResponse(
                offering.getId(),
                offering.getSubjectId(),
                subject != null ? subject.getCode() : null,
                subject != null ? subject.getName() : null,
                subject != null ? subject.getCredits() : 0,
                offering.getSemesterId(),
                semester != null ? semester.getName() : null,
                offering.getTeacherId(),
                teacherName,
                teacherEmail,
                offering.getCode(),
                offering.getName(),
                offering.getStatus(),
                enrollmentStatus
        );
    }

    public static StudentCourseOfferingResponse fromEntity(CourseOffering offering,
                                                           Subject subject,
                                                           Semester semester,
                                                           String teacherName,
                                                           String teacherEmail) {
        return from(offering, subject, semester, teacherName, teacherEmail, null);
    }
}
