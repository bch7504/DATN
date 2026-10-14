package com.studyflow.common.exception;

import com.studyflow.common.api.ErrorEnvelope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Global REST exception handler mapping all application errors to standard ErrorEnvelope.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorEnvelope> handleAppException(AppException ex) {
        String traceId = "req_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        log.warn("Application exception [{}]: {} (TraceId: {})", ex.getCode(), ex.getMessage(), traceId);

        ErrorEnvelope envelope = ErrorEnvelope.builder()
                .code(ex.getCode())
                .message(ex.getMessage())
                .details(ex.getDetails())
                .traceId(traceId)
                .build();

        return ResponseEntity.status(ex.getStatus()).body(envelope);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorEnvelope> handleValidationException(MethodArgumentNotValidException ex) {
        String traceId = "req_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Map<String, Object> details = new HashMap<>();

        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            details.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        ErrorEnvelope envelope = ErrorEnvelope.builder()
                .code("VALIDATION_ERROR")
                .message("Dữ liệu đầu vào không hợp lệ.")
                .details(details)
                .traceId(traceId)
                .build();

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(envelope);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorEnvelope> handleAccessDenied(AccessDeniedException ex) {
        String traceId = "req_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        ErrorEnvelope envelope = ErrorEnvelope.builder()
                .code("FORBIDDEN")
                .message("Bạn không có quyền thực hiện hành động này.")
                .traceId(traceId)
                .build();

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(envelope);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorEnvelope> handleGeneralException(Exception ex) {
        String traceId = "req_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        log.error("Unhandled exception (TraceId: {})", traceId, ex);

        ErrorEnvelope envelope = ErrorEnvelope.builder()
                .code("INTERNAL_SERVER_ERROR")
                .message("Hệ thống đã xảy ra sự cố nội bộ. Vui lòng thử lại sau.")
                .traceId(traceId)
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(envelope);
    }
}
