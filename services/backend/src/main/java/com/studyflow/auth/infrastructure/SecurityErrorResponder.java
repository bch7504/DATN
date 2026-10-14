package com.studyflow.auth.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.common.api.ErrorEnvelope;
import com.studyflow.common.api.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

@Component
public final class SecurityErrorResponder {

    private final ObjectMapper objectMapper;

    public SecurityErrorResponder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Writes the shared JSON error envelope from the security filter chain.
     *
     * @param request current servlet request containing the request trace when available
     * @param response servlet response that has not yet been committed
     * @param status HTTP status code to return
     * @param code stable machine-readable error code
     * @param message safe user-facing Vietnamese message
     * @throws IOException when the response stream cannot be written
     */
    void write(
            HttpServletRequest request,
            HttpServletResponse response,
            int status,
            String code,
            String message
    ) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Object requestId = request.getAttribute(RequestIdFilter.ATTRIBUTE);
        objectMapper.writeValue(response.getOutputStream(), new ErrorEnvelope(
                code,
                message,
                List.of(),
                requestId == null ? "req_unknown" : requestId.toString()
        ));
    }
}
