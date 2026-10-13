package com.studyflow.auth.application;

public record StartRegistrationCommand(String displayName, String email, String password) {
    @Override
    public String toString() {
        return "StartRegistrationCommand[displayName=" + displayName + ", email=" + email + ", password=<redacted>]";
    }
}
