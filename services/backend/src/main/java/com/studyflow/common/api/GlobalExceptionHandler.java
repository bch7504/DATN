package com.studyflow.common.api;

import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.studyflow.common.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.Comparator;
import java.util.List;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public final class GlobalExceptionHandler {

    /**
     * Args: framework missing-route exception and HTTP context, both required.
     * Input: an authenticated request for an unmapped resource. Output: 404 standard error envelope.
     * Errors/side effects: none; does not disclose internal paths or exception messages.
     */
    @ExceptionHandler({org.springframework.web.servlet.resource.NoResourceFoundException.class,
            org.springframework.web.servlet.NoHandlerFoundException.class})
    ResponseEntity<ErrorEnvelope> handleRouteNotFound(Exception exception, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorEnvelope(
                "NOT_FOUND", "Không tìm thấy đường dẫn yêu cầu", List.of(), requestId(request)));
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorEnvelope> handleApiException(ApiException exception, HttpServletRequest request) {
        return ResponseEntity.status(exception.status()).body(new ErrorEnvelope(
                exception.code(),
                exception.getMessage(),
                List.of(),
                requestId(request)
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorEnvelope> handleInvalidBody(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        List<FieldViolation> details = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldViolation(error.getField(), error.getDefaultMessage()))
                .sorted(Comparator.comparing(FieldViolation::field))
                .toList();
        return ResponseEntity.unprocessableEntity().body(new ErrorEnvelope(
                "VALIDATION_FAILED",
                "Dữ liệu gửi lên không hợp lệ",
                details,
                requestId(request)
        ));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ErrorEnvelope> handleConstraintViolation(
            ConstraintViolationException exception,
            HttpServletRequest request
    ) {
        List<FieldViolation> details = exception.getConstraintViolations().stream()
                .map(violation -> new FieldViolation(
                        violation.getPropertyPath().toString(),
                        violation.getMessage()
                ))
                .sorted(Comparator.comparing(FieldViolation::field))
                .toList();
        return ResponseEntity.unprocessableEntity().body(new ErrorEnvelope(
                "VALIDATION_FAILED",
                "Dữ liệu gửi lên không hợp lệ",
                details,
                requestId(request)
        ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorEnvelope> handleUnreadableBody(
            HttpMessageNotReadableException exception,
            HttpServletRequest request
    ) {
        Throwable cause = NestedExceptionUtils.getMostSpecificCause(exception);
        if (cause instanceof UnrecognizedPropertyException unknown) {
            return ResponseEntity.unprocessableEntity().body(new ErrorEnvelope(
                    "UNKNOWN_FIELD",
                    "Yêu cầu chứa trường không được hỗ trợ",
                    List.of(new FieldViolation(unknown.getPropertyName(), "Trường không được phép")),
                    requestId(request)
            ));
        }
        if (cause instanceof InvalidFormatException invalid) {
            String field = invalid.getPath().isEmpty()
                    ? "body"
                    : invalid.getPath().get(invalid.getPath().size() - 1).getFieldName();
            return ResponseEntity.unprocessableEntity().body(new ErrorEnvelope(
                    "VALIDATION_FAILED",
                    "Dữ liệu gửi lên không hợp lệ",
                    List.of(new FieldViolation(field, "Giá trị hoặc định dạng không hợp lệ")),
                    requestId(request)
            ));
        }
        return ResponseEntity.badRequest().body(new ErrorEnvelope(
                "MALFORMED_JSON",
                "Nội dung JSON không hợp lệ",
                List.of(),
                requestId(request)
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ErrorEnvelope> handleTypeMismatch(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request
    ) {
        return ResponseEntity.unprocessableEntity().body(new ErrorEnvelope(
                "VALIDATION_FAILED",
                "Tham số yêu cầu không hợp lệ",
                List.of(new FieldViolation(exception.getName(), "Giá trị hoặc định dạng không hợp lệ")),
                requestId(request)
        ));
    }

    /**
     * Maps container-level multipart size rejection to the public error schema.
     * Args: framework size exception and request context. Input: upload rejected before controller execution.
     * Output: HTTP 413 with error envelope. Errors: none; no file is stored.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ErrorEnvelope> handleUploadTooLarge(
            MaxUploadSizeExceededException exception,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(new ErrorEnvelope(
                "ATTACHMENT_REQUEST_TOO_LARGE",
                "Tổng dung lượng yêu cầu tải tệp vượt quá 26 MB.",
                List.of(),
                requestId(request)
        ));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorEnvelope> handleUnexpected(Exception exception, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorEnvelope(
                "INTERNAL_ERROR",
                "Hệ thống không thể xử lý yêu cầu",
                List.of(),
                requestId(request)
        ));
    }

    private static String requestId(HttpServletRequest request) {
        Object value = request.getAttribute(RequestIdFilter.ATTRIBUTE);
        return value == null ? "req_unknown" : value.toString();
    }
}
