package com.studyflow.common.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends AppException {
    public ConflictException(String code, String message) {
        super(code, message, HttpStatus.CONFLICT);
    }
}
