package com.studyflow.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.user.domain.User;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class TeacherEnrollmentResponse {

    private String id;
    private String courseOfferingId;
    private String studentId;
    private String studentName;
    private String studentEmail;
    private EnrollmentStatus status;
    private Instant requestedAt;
    private Instant approvedAt;
    private Instant rejectedAt;
    private String decisionReason;
    private String decidedBy;

    public TeacherEnrollmentResponse() {
    }

    public static TeacherEnrollmentResponse fromEntity(CourseEnrollment enrollment, User student) {
        TeacherEnrollmentResponse res = new TeacherEnrollmentResponse();
        res.setId(enrollment.getId());
        res.setCourseOfferingId(enrollment.getCourseOfferingId());
        res.setStudentId(enrollment.getStudentId());
        res.setStatus(enrollment.getStatus());
        res.setRequestedAt(enrollment.getRequestedAt());
        res.setApprovedAt(enrollment.getStatus() == EnrollmentStatus.APPROVED ? enrollment.getDecidedAt() : null);
        res.setRejectedAt(enrollment.getStatus() == EnrollmentStatus.REJECTED ? enrollment.getDecidedAt() : null);
        res.setDecisionReason(enrollment.getDecisionNote());
        res.setDecidedBy(enrollment.getDecidedBy());

        if (student != null) {
            res.setStudentName(student.getFullName());
            res.setStudentEmail(student.getEmail());
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

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getStudentEmail() {
        return studentEmail;
    }

    public void setStudentEmail(String studentEmail) {
        this.studentEmail = studentEmail;
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

    public String getDecidedBy() {
        return decidedBy;
    }

    public void setDecidedBy(String decidedBy) {
        this.decidedBy = decidedBy;
    }
}
