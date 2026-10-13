package com.studyflow.auth.infrastructure;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public final class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final SecurityErrorResponder responder;

    RestAuthenticationEntryPoint(SecurityErrorResponder responder) {
        this.responder = responder;
    }

    /**
     * Returns the standard unauthenticated error without exposing token details.
     *
     * @param request rejected servlet request
     * @param response servlet response to populate
     * @param authException Spring Security authentication failure; never serialized or logged here
     * @throws IOException when the JSON response cannot be written
     * @throws ServletException required by the security entry-point contract
     */
    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException, ServletException {
        responder.write(
                request,
                response,
                HttpStatus.UNAUTHORIZED.value(),
                "UNAUTHENTICATED",
                "Bạn cần đăng nhập để thực hiện thao tác này"
        );
    }
}
