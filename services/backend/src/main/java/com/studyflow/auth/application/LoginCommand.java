package com.studyflow.auth.application;

public record LoginCommand(String identifier, String password) {
    @Override
    public String toString() {
        return "LoginCommand[identifier=<redacted>, password=<redacted>]";
    }
}
