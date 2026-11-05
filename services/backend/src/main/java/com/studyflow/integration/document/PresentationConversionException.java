package com.studyflow.integration.document;

/** Safe infrastructure failure from the presentation conversion boundary. */
public final class PresentationConversionException extends RuntimeException {
    public enum Reason { UNAVAILABLE, TIMEOUT, FAILED, OUTPUT_TOO_LARGE }

    private final Reason reason;

    /** Args: stable reason and safe message. Output: conversion exception; no provider body is exposed. */
    public PresentationConversionException(Reason reason, String message) {
        super(message);
        this.reason = java.util.Objects.requireNonNull(reason, "reason");
    }

    public Reason reason() { return reason; }
}
