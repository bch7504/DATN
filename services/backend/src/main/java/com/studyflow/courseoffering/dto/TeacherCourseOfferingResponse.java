package com.studyflow.courseoffering.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.Subject;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class TeacherCourseOfferingResponse {

    private String id;
    private String code;
    private String name;
    private String subjectId;
    private String subjectCode;
    private String subjectName;
    private String semesterId;
    private String semesterName;
    private String teacherId;
    private CourseOfferingStatus status;
    private String rawJoinCode;
    private String joinCodeHint;
    private boolean joinCodeActive;
    private Instant createdAt;
    private Instant updatedAt;

    public TeacherCourseOfferingResponse() {
    }

    public static TeacherCourseOfferingResponse fromEntity(CourseOffering offering,
                                                           Subject subject,
                                                           Semester semester,
                                                           String rawJoinCode) {
        TeacherCourseOfferingResponse res = new TeacherCourseOfferingResponse();
        res.setId(offering.getId());
        res.setCode(offering.getCode());
        res.setName(offering.getName());
        res.setSubjectId(offering.getSubjectId());
        res.setSemesterId(offering.getSemesterId());
        res.setTeacherId(offering.getTeacherId());
        res.setStatus(offering.getStatus());
        res.setRawJoinCode(rawJoinCode);
        res.setJoinCodeHint(offering.getJoinCodeHint());
        res.setJoinCodeActive(offering.isJoinEnabled());
        res.setCreatedAt(offering.getCreatedAt());
        res.setUpdatedAt(offering.getUpdatedAt());

        if (subject != null) {
            res.setSubjectCode(subject.getCode());
            res.setSubjectName(subject.getName());
        }
        if (semester != null) {
            res.setSemesterName(semester.getName());
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

    public String getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(String teacherId) {
        this.teacherId = teacherId;
    }

    public CourseOfferingStatus getStatus() {
        return status;
    }

    public void setStatus(CourseOfferingStatus status) {
        this.status = status;
    }

    public String getRawJoinCode() {
        return rawJoinCode;
    }

    public void setRawJoinCode(String rawJoinCode) {
        this.rawJoinCode = rawJoinCode;
    }

    public String getJoinCodeHint() {
        return joinCodeHint;
    }

    public void setJoinCodeHint(String joinCodeHint) {
        this.joinCodeHint = joinCodeHint;
    }

    public boolean isJoinCodeActive() {
        return joinCodeActive;
    }

    public void setJoinCodeActive(boolean joinCodeActive) {
        this.joinCodeActive = joinCodeActive;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
