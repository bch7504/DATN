package com.studyflow.notification.api;

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
import com.studyflow.notification.application.NotificationService;
import com.studyflow.notification.domain.NotificationType;
import com.studyflow.notification.domain.StudentNotification;
import com.studyflow.study.application.PageResult;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NotificationController.class)
@Import({
        SecurityConfig.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class,
        SecurityErrorResponder.class
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
class NotificationControllerTest {

    private static final UUID STUDENT_ID = UUID.fromString("81c138cf-49a3-44dd-8497-ec8684ee79d7");
    private static final UUID ITEM_ID = UUID.fromString("ed787f71-5242-451a-9c1c-c9e979327c39");
    private static final UUID NOTIFICATION_ID = UUID.fromString("2539957f-e515-4ca9-925c-8dc6d8b71f8a");
    private static final Instant NOW = Instant.parse("2026-10-13T09:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NotificationService service;

    @Test
    void listReturnsStandardPageContract() throws Exception {
        when(service.list(STUDENT_ID, true, 0, 20)).thenReturn(
                new PageResult<>(List.of(notification(null)), 0, 20, 1, 1)
        );

        mockMvc.perform(get("/api/v1/student/notifications")
                        .with(studentJwt())
                        .queryParam("unreadOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(NOTIFICATION_ID.toString()))
                .andExpect(jsonPath("$.items[0].type").value("STUDY_PLAN_DEADLINE"))
                .andExpect(jsonPath("$.items[0].userId").doesNotExist())
                .andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    void markReadReturnsUpdatedSchema() throws Exception {
        when(service.markRead(STUDENT_ID, NOTIFICATION_ID)).thenReturn(notification(NOW));

        mockMvc.perform(patch(
                        "/api/v1/student/notifications/{notificationId}/read",
                        NOTIFICATION_ID
                ).with(studentJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readAt").value(NOW.toString()));
    }

    @Test
    void teacherCannotReadStudentNotifications() throws Exception {
        mockMvc.perform(get("/api/v1/student/notifications").with(teacherJwt()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    private static StudentNotification notification(Instant readAt) {
        return new StudentNotification(
                NOTIFICATION_ID, STUDENT_ID, NotificationType.STUDY_PLAN_DEADLINE,
                "Nhiệm vụ sắp đến hạn", "Nội dung nhắc hạn", "STUDY_PLAN_ITEM",
                ITEM_ID, NOW.plusSeconds(3600), readAt, NOW.minusSeconds(60)
        );
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor studentJwt() {
        return jwt().jwt(token -> token.subject(STUDENT_ID.toString()).claim("role", "STUDENT"))
                .authorities(new SimpleGrantedAuthority("ROLE_STUDENT"));
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor teacherJwt() {
        return jwt().jwt(token -> token.subject(UUID.randomUUID().toString()).claim("role", "TEACHER"))
                .authorities(new SimpleGrantedAuthority("ROLE_TEACHER"));
    }
}
