package com.studyflow.progress.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.studyflow.common.api.GlobalExceptionHandler;
import com.studyflow.progress.application.StudentDashboardService;
import com.studyflow.progress.dto.StudentDashboardResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Dashboard HTTP output schema with synthetic, Student-scoped aggregates. */
class StudentDashboardControllerTest {
    private static final UUID STUDENT = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private StudentDashboardService service;
    private MockMvc mvc;

    /** Args: none. Input: synthetic JWT, mocked dashboard service. Output: MVC endpoint. Errors: setup failure. */
    @BeforeEach
    void setUp() {
        service = mock(StudentDashboardService.class);
        Jwt jwt = Jwt.withTokenValue("synthetic").header("alg", "none").subject(STUDENT.toString()).build();
        HandlerMethodArgumentResolver resolver = new HandlerMethodArgumentResolver() {
            /** Args: method parameter. Output: JWT parameter match. Errors: none. */
            @Override public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
                        && parameter.getParameterType() == Jwt.class;
            }
            /** Args: MVC invocation. Output: synthetic Student JWT. Errors: none. */
            @Override public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                    NativeWebRequest request, WebDataBinderFactory binderFactory) { return jwt; }
        };
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mvc = MockMvcBuilders.standaloneSetup(new StudentDashboardController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper))
                .setCustomArgumentResolvers(resolver).build();
    }

    /** Args: none. Input: synthetic verified metrics. Output: 200 date/streak/goal/overview/classes schema. */
    @Test
    void returnsCompleteDashboardSchema() throws Exception {
        LocalDate day = LocalDate.of(2026, 10, 29);
        when(service.get(STUDENT)).thenReturn(new StudentDashboardResponse(day, "Asia/Ho_Chi_Minh",
                new StudentDashboardResponse.Streak(2, 5, List.of(day)),
                new StudentDashboardResponse.DailyGoal(5, 1, 10, 2, 1, 0),
                new StudentDashboardResponse.Overview(1, 20, 0, 2, 1, 80.0),
                List.of(), List.of()));
        mvc.perform(get("/api/v1/student/dashboard"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.date").value("2026-10-29"))
                .andExpect(jsonPath("$.streak.currentStreak").value(2))
                .andExpect(jsonPath("$.dailyGoal.pageActual").value(1))
                .andExpect(jsonPath("$.overview.totalPublishedPages").value(20))
                .andExpect(jsonPath("$.activeCourseOfferings").isArray());
    }
}
