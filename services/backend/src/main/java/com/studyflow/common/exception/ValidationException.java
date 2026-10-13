package com.studyflow.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class ValidationException extends AppException {
    public ValidationException(String code, String message) {
        super(code, message, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public ValidationException(String code, String message, Map<String, Object> details) {
        super(code, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
    }
}
