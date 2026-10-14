package com.studyflow.courseoffering.dto;

public record ToggleJoinCodeRequest(
        boolean enabled
) {
    public boolean isEnabled() {
        return enabled;
    }
}
