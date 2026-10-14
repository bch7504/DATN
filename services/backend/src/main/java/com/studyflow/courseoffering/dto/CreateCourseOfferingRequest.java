package com.studyflow.courseoffering.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateCourseOfferingRequest(
        @NotNull(message = "ID môn học không được để trống")
        UUID subjectId,

        @NotNull(message = "ID học kỳ không được để trống")
        UUID semesterId,

        @NotBlank(message = "Mã lớp không được để trống")
        @Size(max = 50, message = "Mã lớp không vượt quá 50 ký tự")
        String code,

        @NotBlank(message = "Tên lớp không được để trống")
        @Size(max = 255, message = "Tên lớp không vượt quá 255 ký tự")
        String name
) {
    public UUID getSubjectId() {
        return subjectId;
    }
    public UUID getSemesterId() {
        return semesterId;
    }
    public String getCode() {
        return code;
    }
    public String getName() {
        return name;
    }
}
