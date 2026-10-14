package com.studyflow.enrollment.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record BatchApproveRequest(
        @NotNull(message = "ID lớp học phần không được để trống")
        UUID courseOfferingId,

        @NotEmpty(message = "Danh sách ID yêu cầu duyệt không được rỗng")
        List<UUID> enrollmentIds
) {
    public UUID getCourseOfferingId() {
        return courseOfferingId;
    }
    public List<UUID> getEnrollmentIds() {
        return enrollmentIds;
    }
}
