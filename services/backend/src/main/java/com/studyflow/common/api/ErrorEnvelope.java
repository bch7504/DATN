package com.studyflow.common.api;

import java.util.List;

public record ErrorEnvelope(
        String code,
        String message,
        List<FieldViolation> details,
        String traceId
) {
}
