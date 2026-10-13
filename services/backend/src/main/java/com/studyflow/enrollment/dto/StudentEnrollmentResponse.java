package com.studyflow.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.Subject;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.user.domain.User;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentEnrollmentResponse {

    private String id;
    private String courseOfferingId;
    private String courseOfferingCode;
    private String courseOfferingName;
    private String subjectCode;
    private String subjectName;
    private String semesterName;
    private String teacherName;
    private EnrollmentStatus status;
    private Instant requestedAt;
    private Instant approvedAt;
    private Instant rejectedAt;
    private String decisionReason;

    public StudentEnrollmentResponse() {
    }

    public static StudentEnrollmentResponse from(CourseEnrollment enrollment,
                                                CourseOffering offering,
                                                Subject subject,
                                                Semester semester,
                                                User teacher) {
        StudentEnrollmentResponse res = new StudentEnrollmentResponse();
        res.setId(enrollment.getId());
        res.setCourseOfferingId(enrollment.getCourseOfferingId());
        res.setStatus(enrollment.getStatus());
        res.setRequestedAt(enrollment.getRequestedAt());
        res.setApprovedAt(enrollment.getStatus() == EnrollmentStatus.APPROVED ? enrollment.getDecidedAt() : null);
        res.setRejectedAt(enrollment.getStatus() == EnrollmentStatus.REJECTED ? enrollment.getDecidedAt() : null);
        res.setDecisionReason(enrollment.getDecisionNote());

        if (offering != null) {
            res.setCourseOfferingCode(offering.getCode());
            res.setCourseOfferingName(offering.getName());
        }
        if (subject != null) {
            res.setSubjectCode(subject.getCode());
            res.setSubjectName(subject.getName());
        }
        if (semester != null) {
            res.setSemesterName(semester.getName());
        }
        if (teacher != null) {
            res.setTeacherName(teacher.getFullName());
        }
        return res;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCourseOfferingId() {
        return courseOfferingId;
    }

    public void setCourseOfferingId(String courseOfferingId) {
        this.courseOfferingId = courseOfferingId;
    }

    public String getCourseOfferingCode() {
        return courseOfferingCode;
    }

    public void setCourseOfferingCode(String courseOfferingCode) {
        this.courseOfferingCode = courseOfferingCode;
    }

    public String getCourseOfferingName() {
        return courseOfferingName;
    }

    public void setCourseOfferingName(String courseOfferingName) {
        this.courseOfferingName = courseOfferingName;
    }

    public String getSubjectCode() {
        return subjectCode;
    }

    public void setSubjectCode(String subjectCode) {
        this.subjectCode = subjectCode;
    }

    public String getSubjectName() {
        return subjectName;
    }

    public void setSubjectName(String subjectName) {
        this.subjectName = subjectName;
    }

    public String getSemesterName() {
        return semesterName;
    }

    public void setSemesterName(String semesterName) {
        this.semesterName = semesterName;
    }

    public String getTeacherName() {
        return teacherName;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
    }

    public EnrollmentStatus getStatus() {
        return status;
    }

    public void setStatus(EnrollmentStatus status) {
        this.status = status;
    }

    public Instant getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(Instant requestedAt) {
        this.requestedAt = requestedAt;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(Instant approvedAt) {
        this.approvedAt = approvedAt;
    }

    public Instant getRejectedAt() {
        return rejectedAt;
    }

    public void setRejectedAt(Instant rejectedAt) {
        this.rejectedAt = rejectedAt;
    }

    public String getDecisionReason() {
        return decisionReason;
    }

    public void setDecisionReason(String decisionReason) {
        this.decisionReason = decisionReason;
    }
}
