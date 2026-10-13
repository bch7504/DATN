package com.studyflow.courseoffering.dto;

import jakarta.validation.constraints.NotNull;

public class ToggleJoinCodeRequest {

    @NotNull(message = "Trạng thái bật/tắt không được null")
    private Boolean enabled;

    public ToggleJoinCodeRequest() {
    }

    public ToggleJoinCodeRequest(Boolean enabled) {
        this.enabled = enabled;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
}
