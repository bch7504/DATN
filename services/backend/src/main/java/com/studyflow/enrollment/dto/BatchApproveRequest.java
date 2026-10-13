package com.studyflow.enrollment.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class BatchApproveRequest {

    @NotNull(message = "Mã lớp học phần không được để trống")
    private String courseOfferingId;

    @NotEmpty(message = "Danh sách đơn cần duyệt không được rỗng")
    private List<String> enrollmentIds;

    public BatchApproveRequest() {
    }

    public BatchApproveRequest(String courseOfferingId, List<String> enrollmentIds) {
        this.courseOfferingId = courseOfferingId;
        this.enrollmentIds = enrollmentIds;
    }

    public String getCourseOfferingId() {
        return courseOfferingId;
    }

    public void setCourseOfferingId(String courseOfferingId) {
        this.courseOfferingId = courseOfferingId;
    }

    public List<String> getEnrollmentIds() {
        return enrollmentIds;
    }

    public void setEnrollmentIds(List<String> enrollmentIds) {
        this.enrollmentIds = enrollmentIds;
    }
}
