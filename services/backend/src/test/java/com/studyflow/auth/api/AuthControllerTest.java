package com.studyflow.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studyflow.auth.application.AuthService;
import com.studyflow.auth.application.RegistrationStatus;
import com.studyflow.auth.application.SessionTokens;
import com.studyflow.auth.infrastructure.AuthProperties;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private AuthProperties properties;

    @Test
    void registerReturnsAcceptedResponseSchemaForValidInput() throws Exception {
        when(authService.startRegistration(any())).thenReturn(RegistrationStatus.verificationRequired(
                Instant.parse("2026-10-13T08:10:00Z"),
                Instant.parse("2026-10-13T08:01:00Z")
        ));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Nguyễn Văn A",
                                  "email": "b22dccn001@stu.ptit.edu.vn",
                                  "password": "StrongPass1"
                                }
                                """))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("VERIFICATION_REQUIRED"))
                .andExpect(jsonPath("$.expiresAt").value("2026-10-13T08:10:00Z"))
                .andExpect(jsonPath("$.resendAvailableAt").value("2026-10-13T08:01:00Z"));
    }

    @Test
    void registerReturnsStructuredValidationErrorForInvalidInput() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "A",
                                  "email": "not-an-email",
                                  "password": "weak"
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.details").isArray())
                .andExpect(jsonPath("$.traceId").exists());
    }

    /**
     * Args: password is a six- or twelve-character boundary value.
     * Input: synthetic Student registration; output: accepted OTP response schema.
     * Errors: test fails if validation rejects a permitted length.
     */
    @ParameterizedTest
    @ValueSource(strings = {"Abc123", "Abc123456789"})
    void registerAcceptsPasswordLengthBoundaries(String password) throws Exception {
        when(authService.startRegistration(any())).thenReturn(RegistrationStatus.verificationRequired(
                Instant.parse("2026-10-13T08:10:00Z"),
                Instant.parse("2026-10-13T08:01:00Z")
        ));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"Sinh viên Test","email":"student@example.invalid","password":"%s"}
                                """.formatted(password)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("VERIFICATION_REQUIRED"));
    }

    /**
     * Args: password is a five- or thirteen-character boundary violation.
     * Input: synthetic Student registration; output: 422 with the password field error.
     * Errors: test fails if an invalid length reaches the registration service.
     */
    @ParameterizedTest
    @ValueSource(strings = {"Abc12", "Abc1234567890"})
    void registerRejectsPasswordOutsideLengthBoundaries(String password) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"Sinh viên Test","email":"student@example.invalid","password":"%s"}
                                """.formatted(password)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.details[0].field").value("password"))
                .andExpect(jsonPath("$.details[0].message").value("Mật khẩu phải có từ 6 đến 12 ký tự"));
    }

    @Test
    void loginReturnsBothHttpOnlySessionCookies() throws Exception {
        when(authService.login(any())).thenReturn(new SessionTokens(
                "access-token",
                Instant.parse("2026-10-13T08:15:00Z"),
                "refresh-token",
                Instant.parse("2026-11-12T08:00:00Z")
        ));
        when(properties.accessTokenTtl()).thenReturn(Duration.ofMinutes(15));
        when(properties.refreshTokenTtl()).thenReturn(Duration.ofDays(30));
        when(properties.cookieSecure()).thenReturn(true);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "identifier": "b22dccn001@ptit.edu.vn",
                                  "password": "StrongPass1"
                                }
                                """))
                .andExpect(status().isNoContent())
                .andExpect(result -> {
                    List<String> cookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
                    assertThat(cookies).hasSize(2);
                    assertThat(cookies).anyMatch(value -> value.startsWith("SF_ACCESS=access-token"));
                    assertThat(cookies).anyMatch(value -> value.startsWith("SF_REFRESH=refresh-token"));
                    assertThat(cookies).allMatch(value -> value.contains("HttpOnly"));
                    assertThat(cookies).allMatch(value -> value.contains("Secure"));
                    assertThat(cookies).allMatch(value -> value.contains("SameSite=Strict"));
                });
    }
}
