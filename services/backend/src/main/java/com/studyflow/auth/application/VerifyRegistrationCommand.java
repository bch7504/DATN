package com.studyflow.auth.application;

public record VerifyRegistrationCommand(String email, String verificationCode) {
    @Override
    public String toString() {
        return "VerifyRegistrationCommand[email=" + email + ", verificationCode=<redacted>]";
    }
}
