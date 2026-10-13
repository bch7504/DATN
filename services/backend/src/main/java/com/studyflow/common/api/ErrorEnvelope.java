package com.studyflow.common.api;

import java.util.Map;

/**
 * Standard API error envelope conforming to docs/api-plan.md Section 1.
 *
 * Contract:
 * - code: String error code (e.g. JOIN_CODE_NOT_FOUND, INVALID_JOIN_CODE)
 * - message: Human-readable error description in Vietnamese
 * - details: Optional field-level error details or validation violations
 * - traceId: Unique request/error tracing identifier
 */
public class ErrorEnvelope {

    private String code;
    private String message;
    private Map<String, Object> details;
    private String traceId;

    public ErrorEnvelope() {
    }

    public ErrorEnvelope(String code, String message, Map<String, Object> details, String traceId) {
        this.code = code;
        this.message = message;
        this.details = details;
        this.traceId = traceId;
    }

    public static ErrorEnvelope of(String code, String message, String traceId) {
        return new ErrorEnvelope(code, message, null, traceId);
    }

    public static ErrorEnvelope of(String code, String message, Map<String, Object> details, String traceId) {
        return new ErrorEnvelope(code, message, details, traceId);
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public void setDetails(Map<String, Object> details) {
        this.details = details;
    }

    public String getTraceId() {
        return traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }

    public static class Builder {
        private String code;
        private String message;
        private Map<String, Object> details;
        private String traceId;

        public Builder code(String code) {
            this.code = code;
            return this;
        }

        public Builder message(String message) {
            this.message = message;
            return this;
        }

        public Builder details(Map<String, Object> details) {
            this.details = details;
            return this;
        }

        public Builder traceId(String traceId) {
            this.traceId = traceId;
            return this;
        }

        public ErrorEnvelope build() {
            return new ErrorEnvelope(code, message, details, traceId);
        }
    }
}
