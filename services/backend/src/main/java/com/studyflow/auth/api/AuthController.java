package com.studyflow.auth.api;

import com.studyflow.auth.application.AuthService;
import com.studyflow.auth.application.LoginCommand;
import com.studyflow.auth.application.SessionTokens;
import com.studyflow.auth.application.StartRegistrationCommand;
import com.studyflow.auth.application.VerifyRegistrationCommand;
import com.studyflow.auth.infrastructure.AuthProperties;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    static final String ACCESS_COOKIE = "SF_ACCESS";
    static final String REFRESH_COOKIE = "SF_REFRESH";

    private final AuthService authService;
    private final AuthProperties properties;

    public AuthController(AuthService authService, AuthProperties properties) {
        this.authService = authService;
        this.properties = properties;
    }

    /**
     * Begins Student registration for an institutional email.
     *
     * @param request validated display name, PTIT email and password
     * @return HTTP 202 with OTP expiry and resend availability
     * @throws com.studyflow.common.exception.ApiException when the domain, account state or resend timing is invalid
     */
    @PostMapping("/register")
    public ResponseEntity<RegistrationStatusResponse> register(@Valid @RequestBody RegisterRequest request) {
        var status = authService.startRegistration(new StartRegistrationCommand(
                request.displayName(), request.email(), request.password()
        ));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(RegistrationStatusResponse.from(status));
    }

    /**
     * Verifies the emailed OTP and creates the Student account.
     *
     * @param request validated PTIT email and six-digit OTP
     * @return HTTP 204 with no response body
     * @throws com.studyflow.common.exception.ApiException when the challenge is invalid or unavailable
     */
    @PostMapping("/verify-registration")
    public ResponseEntity<Void> verifyRegistration(@Valid @RequestBody VerifyRegistrationRequest request) {
        authService.verifyRegistration(new VerifyRegistrationCommand(request.email(), request.verificationCode()));
        return ResponseEntity.noContent().build();
    }

    /**
     * Sends a replacement OTP for a pending registration.
     *
     * @param request validated PTIT email
     * @return HTTP 202 with the replacement OTP timing
     * @throws com.studyflow.common.exception.ApiException when no registration is pending or cooldown is active
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<RegistrationStatusResponse> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request
    ) {
        var status = authService.resendVerification(request.email());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(RegistrationStatusResponse.from(status));
    }

    /**
     * Authenticates a user and returns the session only through secure HttpOnly cookies.
     *
     * @param request validated email/username and password
     * @return HTTP 204 with access and refresh Set-Cookie headers
     * @throws com.studyflow.common.exception.ApiException when credentials or account state are invalid
     */
    @PostMapping("/login")
    public ResponseEntity<Void> login(@Valid @RequestBody LoginRequest request) {
        SessionTokens tokens = authService.login(new LoginCommand(request.identifier(), request.password()));
        return sessionResponse(tokens);
    }

    /**
     * Rotates a valid refresh session.
     *
     * @param refreshToken required SF_REFRESH HttpOnly cookie
     * @return HTTP 204 with replacement access and refresh cookies
     * @throws com.studyflow.common.exception.ApiException when the refresh session is missing or invalid
     */
    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken
    ) {
        return sessionResponse(authService.refresh(refreshToken));
    }

    /**
     * Revokes the current refresh session and clears both authentication cookies.
     *
     * @param refreshToken optional SF_REFRESH cookie; logout is idempotent when absent
     * @return HTTP 204 with expired access and refresh cookies
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken
    ) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearCookie(ACCESS_COOKIE).toString())
                .header(HttpHeaders.SET_COOKIE, clearCookie(REFRESH_COOKIE).toString())
                .build();
    }

    private ResponseEntity<Void> sessionResponse(SessionTokens tokens) {
        ResponseCookie access = sessionCookie(
                ACCESS_COOKIE,
                tokens.accessToken(),
                properties.accessTokenTtl()
        );
        ResponseCookie refresh = sessionCookie(
                REFRESH_COOKIE,
                tokens.refreshToken(),
                properties.refreshTokenTtl()
        );
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, access.toString())
                .header(HttpHeaders.SET_COOKIE, refresh.toString())
                .build();
    }

    private ResponseCookie sessionCookie(String name, String value, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private ResponseCookie clearCookie(String name) {
        return ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Strict")
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
    }
}
