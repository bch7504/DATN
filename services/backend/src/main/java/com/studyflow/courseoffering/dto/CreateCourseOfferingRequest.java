package com.studyflow.courseoffering.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateCourseOfferingRequest {

    @NotBlank(message = "Mã môn học không được để trống")
    private String subjectId;

    @NotBlank(message = "Mã học kỳ không được để trống")
    private String semesterId;

    @Size(max = 50, message = "Mã lớp tối đa 50 ký tự")
    private String code;

    @Size(max = 255, message = "Tên lớp tối đa 255 ký tự")
    private String name;

    public CreateCourseOfferingRequest() {
    }

    public CreateCourseOfferingRequest(String subjectId, String semesterId, String code, String name) {
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
