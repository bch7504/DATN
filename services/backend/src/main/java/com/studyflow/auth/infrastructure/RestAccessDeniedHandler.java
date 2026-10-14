package com.studyflow.auth.infrastructure;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public final class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final SecurityErrorResponder responder;

    RestAccessDeniedHandler(SecurityErrorResponder responder) {
        this.responder = responder;
    }

    /**
     * Returns the standard forbidden error for an authenticated user with the wrong role.
     *
     * @param request rejected servlet request
     * @param response servlet response to populate
     * @param accessDeniedException authorization failure; never serialized or logged here
     * @throws IOException when the JSON response cannot be written
     * @throws ServletException required by the access-denied handler contract
     */
    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException
    ) throws IOException, ServletException {
        responder.write(
                request,
                response,
                HttpStatus.FORBIDDEN.value(),
                "FORBIDDEN",
                "Bạn không có quyền thực hiện thao tác này"
        );
    }
}
