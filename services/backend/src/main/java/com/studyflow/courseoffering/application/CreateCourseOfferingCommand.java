package com.studyflow.courseoffering.application;

/**
 * Command DTO for creating a new Course Offering.
 */
public class CreateCourseOfferingCommand {

    private String subjectId;
    private String semesterId;
    private String code;
    private String name;

    public CreateCourseOfferingCommand() {
    }

    public CreateCourseOfferingCommand(String subjectId, String semesterId, String code, String name) {
        this.subjectId = subjectId;
        this.semesterId = semesterId;
        this.code = code;
        this.name = name;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
    }

    public String getSemesterId() {
        return semesterId;
    }

    public void setSemesterId(String semesterId) {
        this.semesterId = semesterId;
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
}
