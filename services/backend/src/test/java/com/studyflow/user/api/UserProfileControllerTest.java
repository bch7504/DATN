package com.studyflow.user.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studyflow.auth.infrastructure.RestAccessDeniedHandler;
import com.studyflow.auth.infrastructure.RestAuthenticationEntryPoint;
import com.studyflow.auth.infrastructure.SecurityConfig;
import com.studyflow.auth.infrastructure.SecurityErrorResponder;
import com.studyflow.user.application.UserProfile;
import com.studyflow.user.application.UserProfileService;
import com.studyflow.user.domain.UserRole;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest({UserProfileController.class, UserProfileControllerTest.RoleProbeController.class})
@Import({
        SecurityConfig.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class,
        SecurityErrorResponder.class,
        UserProfileControllerTest.RoleProbeController.class
})
@TestPropertySource(properties = {
        "studyflow.auth.allowed-email-domain=ptit.edu.vn",
        "studyflow.auth.otp-ttl=10m",
        "studyflow.auth.resend-cooldown=60s",
        "studyflow.auth.max-verification-attempts=5",
        "studyflow.auth.access-token-ttl=15m",
        "studyflow.auth.refresh-token-ttl=30d",
        "studyflow.auth.jwt-issuer=studyflow",
        "studyflow.auth.jwt-secret=01234567890123456789012345678901",
        "studyflow.auth.cookie-secure=true",
        "studyflow.auth.mail-from=no-reply@ptit.edu.vn"
})
class UserProfileControllerTest {

    private static final UUID USER_ID = UUID.fromString("4a754e8d-70ae-4ba9-af24-85d4e5506e65");

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserProfileService profiles;

    @Test
    void getProfileReturnsAuthenticatedUserSchema() throws Exception {
        when(profiles.getProfile(USER_ID)).thenReturn(profile("Nguyễn Văn A", "Asia/Ho_Chi_Minh"));

        mockMvc.perform(get("/api/v1/me").with(studentJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(USER_ID.toString()))
                .andExpect(jsonPath("$.displayName").value("Nguyễn Văn A"))
                .andExpect(jsonPath("$.email").value("b22dccn001@ptit.edu.vn"))
                .andExpect(jsonPath("$.username").value("b22dccn001"))
                .andExpect(jsonPath("$.timeZone").value("Asia/Ho_Chi_Minh"))
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void patchProfileReturnsUpdatedSchema() throws Exception {
        when(profiles.updateProfile(eq(USER_ID), any())).thenReturn(profile("Nguyễn Văn B", "Asia/Bangkok"));

        mockMvc.perform(patch("/api/v1/me")
                        .with(studentJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Nguyễn Văn B",
                                  "timeZone": "Asia/Bangkok"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Nguyễn Văn B"))
                .andExpect(jsonPath("$.timeZone").value("Asia/Bangkok"));
    }

    @Test
    void patchProfileRejectsRoleFieldInsteadOfIgnoringIt() throws Exception {
        mockMvc.perform(patch("/api/v1/me")
                        .with(studentJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Nguyễn Văn B",
                                  "role": "ADMIN"
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("UNKNOWN_FIELD"))
                .andExpect(jsonPath("$.details[0].field").value("role"));
    }

    @Test
    void getProfileRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.traceId").exists());
    }

    @Test
    void studentRoleCanAccessStudentApi() throws Exception {
        mockMvc.perform(get("/api/v1/student/probe").with(studentJwt()))
                .andExpect(status().isOk());
    }

    @Test
    void studentRoleCannotAccessTeacherApi() throws Exception {
        mockMvc.perform(get("/api/v1/teacher/probe").with(studentJwt()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor studentJwt() {
        return jwt().jwt(token -> token
                .subject(USER_ID.toString())
                .claim("role", "STUDENT"))
                .authorities(new SimpleGrantedAuthority("ROLE_STUDENT"));
    }

    private static UserProfile profile(String displayName, String timeZone) {
        return new UserProfile(
                USER_ID,
                displayName,
                "b22dccn001@ptit.edu.vn",
                "b22dccn001",
                timeZone,
                UserRole.STUDENT
        );
    }

    @RestController
    static final class RoleProbeController {

        @GetMapping("/api/v1/student/probe")
        String studentProbe() {
            return "student";
        }

        @GetMapping("/api/v1/teacher/probe")
        String teacherProbe() {
            return "teacher";
        }
    }
}
