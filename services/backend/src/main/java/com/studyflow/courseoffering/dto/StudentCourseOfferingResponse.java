package com.studyflow.courseoffering.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.Subject;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.user.domain.User;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentCourseOfferingResponse {

    private String id;
    private String code;
    private String name;
    private String subjectId;
    private String subjectCode;
    private String subjectName;
    private String semesterId;
    private String semesterName;
    private String teacherName;
    private CourseOfferingStatus status;
    private Instant createdAt;

    public StudentCourseOfferingResponse() {
    }

    public static StudentCourseOfferingResponse from(CourseOffering offering,
                                                    Subject subject,
                                                    Semester semester,
                                                    User teacher) {
        StudentCourseOfferingResponse res = new StudentCourseOfferingResponse();
        res.setId(offering.getId());
        res.setCode(offering.getCode());
        res.setName(offering.getName());
        res.setSubjectId(offering.getSubjectId());
        res.setSemesterId(offering.getSemesterId());
        res.setStatus(offering.getStatus());
        res.setCreatedAt(offering.getCreatedAt());

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

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
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

    public String getSemesterId() {
        return semesterId;
    }

    public void setSemesterId(String semesterId) {
        this.semesterId = semesterId;
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

    public CourseOfferingStatus getStatus() {
        return status;
    }

    public void setStatus(CourseOfferingStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
