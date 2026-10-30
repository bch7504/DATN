package com.studyflow.progress.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.studyflow.common.api.GlobalExceptionHandler;
import com.studyflow.progress.application.ConfigureDailyGoalCommand;
import com.studyflow.progress.application.DailyGoalProgressDTO;
import com.studyflow.progress.application.DailyGoalService;
import com.studyflow.progress.application.LearningEventService;
import com.studyflow.progress.application.StudyMetricsService;
import com.studyflow.progress.domain.LearningEventRepository;
import com.studyflow.progress.dto.StudentDailyGoalRequest;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StudentProgressControllerTest {

    private static final UUID STUDENT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private StudyMetricsService studyMetricsService;

    @Mock
    private DailyGoalService dailyGoalService;

    @Mock
    private LearningEventService learningEventService;

    @Mock
    private LearningEventRepository learningEventRepository;

    private Clock fixedClock;
    private Jwt mockJwt;

    @BeforeEach
    void setUp() {
        // 2026-05-15 is a Friday in Asia/Ho_Chi_Minh
        fixedClock = Clock.fixed(Instant.parse("2026-05-15T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

        StudentProgressController controller = new StudentProgressController(
                studyMetricsService,
                dailyGoalService,
                learningEventService,
                learningEventRepository,
                fixedClock
        );

        mockJwt = Jwt.withTokenValue("mock-jwt-token")
                .header("alg", "none")
                .subject(STUDENT_ID.toString())
                .claim("role", "STUDENT")
                .build();

        HandlerMethodArgumentResolver jwtResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
                        && parameter.getParameterType().isAssignableFrom(Jwt.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter,
                                          ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest,
                                          WebDataBinderFactory binderFactory) {
                return mockJwt;
            }
        };

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(jwtResolver)
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/student/study-streak returns calculated streak and 7-day weekly activity")
    void getStudyStreakReturnsCorrectMetrics() throws Exception {
        LocalDate today = LocalDate.of(2026, 5, 15);
        LocalDate yesterday = LocalDate.of(2026, 5, 14);
        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");

        when(learningEventService.resolveStudentZone(STUDENT_ID)).thenReturn(zoneId);
        when(learningEventRepository.findDistinctActivityDatesByStudentId(STUDENT_ID))
                .thenReturn(List.of(today, yesterday));

        mockMvc.perform(get("/api/v1/student/study-streak"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStreak").value(2))
                .andExpect(jsonPath("$.longestStreak").value(2))
                .andExpect(jsonPath("$.activityDays").value(2))
                .andExpect(jsonPath("$.timeZone").value("Asia/Ho_Chi_Minh"))
                .andExpect(jsonPath("$.asOfDate").value("2026-05-15"))
                .andExpect(jsonPath("$.today").value("2026-05-15"))
                .andExpect(jsonPath("$.lastActiveDate").value("2026-05-15"))
                .andExpect(jsonPath("$.weeklyActivity").isArray())
                .andExpect(jsonPath("$.weeklyActivity.length()").value(7));
    }

    @Test
    @DisplayName("GET /api/v1/student/streak alias also returns streak metrics")
    void getStreakAliasReturnsCorrectMetrics() throws Exception {
        LocalDate today = LocalDate.of(2026, 5, 15);
        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");

        when(learningEventService.resolveStudentZone(STUDENT_ID)).thenReturn(zoneId);
        when(learningEventRepository.findDistinctActivityDatesByStudentId(STUDENT_ID))
                .thenReturn(List.of(today));

        mockMvc.perform(get("/api/v1/student/streak"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStreak").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/student/daily-goal returns dual-compatible spec and frontend fields")
    void getDailyGoalReturnsProgress() throws Exception {
        DailyGoalProgressDTO progress = new DailyGoalProgressDTO(
                10, 8,
                20, 20,
                2, 1,
                false,
                LocalDate.of(2026, 5, 15),
                "Asia/Ho_Chi_Minh"
        );
        when(dailyGoalService.get(STUDENT_ID)).thenReturn(progress);

        mockMvc.perform(get("/api/v1/student/daily-goal"))
                .andExpect(status().isOk())
                // Spec fields
                .andExpect(jsonPath("$.pageTarget").value(10))
                .andExpect(jsonPath("$.pageActual").value(8))
                .andExpect(jsonPath("$.quizQuestionTarget").value(20))
                .andExpect(jsonPath("$.quizQuestionActual").value(20))
                .andExpect(jsonPath("$.taskTarget").value(2))
                .andExpect(jsonPath("$.taskActual").value(1))
                .andExpect(jsonPath("$.completed").value(false))
                // Frontend compatibility fields
                .andExpect(jsonPath("$.targetPages").value(10))
                .andExpect(jsonPath("$.actualPages").value(8))
                .andExpect(jsonPath("$.pagesPercentage").value(80))
                .andExpect(jsonPath("$.targetQuizQuestions").value(20))
                .andExpect(jsonPath("$.actualQuizQuestions").value(20))
                .andExpect(jsonPath("$.quizPercentage").value(100))
                .andExpect(jsonPath("$.quizQuestionsPercentage").value(100))
                .andExpect(jsonPath("$.isCompleted").value(false));
    }

    @Test
    @DisplayName("PUT /api/v1/student/daily-goal configures new targets and returns progress")
    void configureDailyGoalSuccess() throws Exception {
        StudentDailyGoalRequest req = new StudentDailyGoalRequest(15, 30, 5);
        DailyGoalProgressDTO progress = new DailyGoalProgressDTO(
                15, 0,
                30, 0,
                5, 0,
                false,
                LocalDate.of(2026, 5, 15),
                "Asia/Ho_Chi_Minh"
        );
        when(dailyGoalService.configure(eq(STUDENT_ID), any(ConfigureDailyGoalCommand.class)))
                .thenReturn(progress);

        mockMvc.perform(put("/api/v1/student/daily-goal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pageTarget").value(15))
                .andExpect(jsonPath("$.quizQuestionTarget").value(30))
                .andExpect(jsonPath("$.taskTarget").value(5));

        verify(dailyGoalService).configure(eq(STUDENT_ID), eq(new ConfigureDailyGoalCommand(15, 30, 5)));
    }

    @Test
    @DisplayName("PUT /api/v1/student/daily-goal with totalTarget <= 0 returns 422 INVALID_DAILY_GOAL")
    void configureDailyGoalZeroTotalReturns422() throws Exception {
        StudentDailyGoalRequest req = new StudentDailyGoalRequest(0, 0, 0);

        mockMvc.perform(put("/api/v1/student/daily-goal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_DAILY_GOAL"));
    }

    @Test
    @DisplayName("A client cannot forge an unverified study-completion event")
    void genericLearningEventRouteIsUnavailable() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/v1/student/learning-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventType\":\"QUIZ_COMPLETED\",\"quantity\":200}"))
                .andExpect(status().isNotFound());
    }
}
