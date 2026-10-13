package com.studyflow.user.dto;

import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @Size(max = 255, message = "Họ và tên tối đa 255 ký tự")
    private String displayName;

    @Size(max = 50, message = "Múi giờ tối đa 50 ký tự")
    private String timeZone;

    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String displayName, String timeZone) {
        this.displayName = displayName;
        this.timeZone = timeZone;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }
}
