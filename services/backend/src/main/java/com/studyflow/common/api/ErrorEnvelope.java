package com.studyflow.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorEnvelope {

    private String code;
    private String message;
    private Object details;
    private String traceId;

    public ErrorEnvelope() {
    }

    public ErrorEnvelope(String code, String message, List<FieldViolation> details, String traceId) {
        this.code = code;
        this.message = message;
        this.details = details;
        this.traceId = traceId;
    }

    public ErrorEnvelope(String code, String message, Object details, String traceId) {
        this.code = code;
        this.message = message;
        this.details = details;
        this.traceId = traceId;
    }

    public static ErrorEnvelope of(String code, String message, String traceId) {
        return new ErrorEnvelope(code, message, null, traceId);
    }

    public static ErrorEnvelope of(String code, String message, Object details, String traceId) {
        return new ErrorEnvelope(code, message, details, traceId);
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getCode() {
        return code;
    }

    public String code() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public String message() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Object getDetails() {
        return details;
    }

    public Object details() {
        return details;
    }

    public void setDetails(Object details) {
        this.details = details;
    }

    public String getTraceId() {
        return traceId;
    }

    public String traceId() {
        return traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }

    public static class Builder {
        private String code;
        private String message;
        private Object details;
        private String traceId;

        public Builder code(String code) {
            this.code = code;
            return this;
        }

        public Builder message(String message) {
            this.message = message;
            return this;
        }

        public Builder details(Object details) {
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
