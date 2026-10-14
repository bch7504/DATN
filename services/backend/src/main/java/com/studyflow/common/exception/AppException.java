package com.studyflow.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Base typed exception encapsulating error code, HTTP status, and details.
 * Inherits from ApiException so that common/api/GlobalExceptionHandler handles it uniformly.
 */
public class AppException extends ApiException {

    private final Map<String, Object> details;

    public AppException(String code, String message, HttpStatus status) {
        super(status, code, message);
        this.details = null;
    }

    public AppException(String code, String message, HttpStatus status, Map<String, Object> details) {
        super(status, code, message);
        this.details = details;
    }

    public String getCode() {
        return code();
    }

    public String getErrorCode() {
        return code();
    }

    public HttpStatus getStatus() {
        return status();
    }

    public Map<String, Object> getDetails() {
        return details;
    }
}
