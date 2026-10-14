package com.studyflow.study.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studyflow.auth.infrastructure.RestAccessDeniedHandler;
import com.studyflow.auth.infrastructure.RestAuthenticationEntryPoint;
import com.studyflow.auth.infrastructure.SecurityConfig;
import com.studyflow.auth.infrastructure.SecurityErrorResponder;
import com.studyflow.study.application.StudyPlanService;
import com.studyflow.study.domain.StudyPlan;
import com.studyflow.study.domain.StudyPlanItem;
import com.studyflow.study.domain.StudyPlanItemStatus;
import com.studyflow.study.domain.StudyPlanItemType;
import com.studyflow.study.domain.StudyPlanStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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

@WebMvcTest(StudyPlanController.class)
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
class StudyPlanControllerTest {

    private static final UUID STUDENT_ID = UUID.fromString("81c138cf-49a3-44dd-8497-ec8684ee79d7");
    private static final UUID PLAN_ID = UUID.fromString("6726d698-a9de-4145-a43e-c7e5a15bb8f4");
    private static final UUID ITEM_ID = UUID.fromString("ed787f71-5242-451a-9c1c-c9e979327c39");
    private static final Instant NOW = Instant.parse("2026-10-13T09:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StudyPlanService service;

    @Test
    void createPlanReturnsCreatedContract() throws Exception {
        when(service.createPlan(eq(STUDENT_ID), any())).thenReturn(plan());

        mockMvc.perform(post("/api/v1/study-plans")
                        .with(studentJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Ôn thi học kỳ",
                                  "description":"Kế hoạch tháng 10",
                                  "startDate":"2026-10-01",
                                  "endDate":"2026-10-31"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(PLAN_ID.toString()))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.studentId").doesNotExist());
    }

    @Test
    void createPlanRejectsInvalidInputSchema() throws Exception {
        mockMvc.perform(post("/api/v1/study-plans")
                        .with(studentJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"","startDate":"2026-10-01"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.details").isArray());
    }

    @Test
    void teacherCannotAccessPersonalStudyPlanApi() throws Exception {
        mockMvc.perform(get("/api/v1/study-plans").with(teacherJwt()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void completeItemPassesIdempotencyKeyAndReturnsSchema() throws Exception {
        StudyPlanItem completed = new StudyPlanItem(
                ITEM_ID, PLAN_ID, "Đọc chương 1", null, StudyPlanItemType.TASK,
                null, null, Instant.parse("2026-10-15T12:00:00Z"),
                Instant.parse("2026-10-14T12:00:00Z"), NOW,
                StudyPlanItemStatus.COMPLETED, NOW, NOW.minusSeconds(100), NOW
        );
        when(service.changeItemStatus(
                STUDENT_ID, ITEM_ID, StudyPlanItemStatus.COMPLETED, "complete-123"
        )).thenReturn(completed);

        mockMvc.perform(patch("/api/v1/study-plan-items/{itemId}/status", ITEM_ID)
                        .with(studentJwt())
                        .header("Idempotency-Key", "complete-123")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ITEM_ID.toString()))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.completedAt").value(NOW.toString()));
    }

    @Test
    void calendarReturnsOwnerScopedItems() throws Exception {
        when(service.calendar(eq(STUDENT_ID), any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/calendar")
                        .with(studentJwt())
                        .queryParam("from", "2026-10-12T17:00:00Z")
                        .queryParam("to", "2026-10-19T17:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.from").value("2026-10-12T17:00:00Z"))
                .andExpect(jsonPath("$.to").value("2026-10-19T17:00:00Z"))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void createItemRejectsUnknownTypeWithValidationEnvelope() throws Exception {
        mockMvc.perform(post("/api/v1/study-plans/{planId}/items", PLAN_ID)
                        .with(studentJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Đọc chương 1",
                                  "type":"UNKNOWN",
                                  "dueAt":"2026-10-15T12:00:00Z"
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.details[0].field").value("type"));
    }

    private static StudyPlan plan() {
        return new StudyPlan(
                PLAN_ID, STUDENT_ID, "Ôn thi học kỳ", "Kế hoạch tháng 10",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                StudyPlanStatus.ACTIVE, NOW, NOW
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
