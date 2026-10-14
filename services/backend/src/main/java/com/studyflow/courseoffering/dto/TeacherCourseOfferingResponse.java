package com.studyflow.courseoffering.dto;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.Subject;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;

import java.time.Instant;
import java.util.UUID;

public record TeacherCourseOfferingResponse(
        UUID id,
        UUID subjectId,
        String subjectCode,
        String subjectName,
        UUID semesterId,
        String semesterName,
        UUID teacherId,
        String teacherName,
        String code,
        String name,
        String joinCodeHint,
        String rawJoinCode,
        boolean joinEnabled,
        CourseOfferingStatus status,
        long enrolledCount,
        long pendingCount,
        Instant createdAt,
        Instant updatedAt
) {
    public static TeacherCourseOfferingResponse from(CourseOffering offering,
                                                     Subject subject,
                                                     Semester semester,
                                                     String teacherName,
                                                     long enrolledCount,
                                                     long pendingCount,
                                                     String rawJoinCode) {
        return new TeacherCourseOfferingResponse(
                offering.getId(),
                offering.getSubjectId(),
                subject != null ? subject.getCode() : null,
                subject != null ? subject.getName() : null,
                offering.getSemesterId(),
                semester != null ? semester.getName() : null,
                offering.getTeacherId(),
                teacherName,
                offering.getCode(),
                offering.getName(),
                offering.getJoinCodeHint(),
                rawJoinCode,
                offering.isJoinEnabled(),
                offering.getStatus(),
                enrolledCount,
                pendingCount,
                offering.getCreatedAt(),
                offering.getUpdatedAt()
        );
    }

    public static TeacherCourseOfferingResponse fromEntity(CourseOffering offering,
                                                           Subject subject,
                                                           Semester semester,
                                                           String rawJoinCode) {
        return from(offering, subject, semester, null, 0, 0, rawJoinCode);
    }
}
