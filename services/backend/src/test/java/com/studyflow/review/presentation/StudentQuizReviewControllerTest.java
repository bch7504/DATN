package com.studyflow.review.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.studyflow.common.api.GlobalExceptionHandler;
import com.studyflow.review.application.QuestionOptionDTO;
import com.studyflow.review.application.QuizAttemptService;
import com.studyflow.review.application.QuizCitationSourceDTO;
import com.studyflow.review.application.QuizQuestionReviewDTO;
import com.studyflow.review.application.QuizQuestionTakingDTO;
import com.studyflow.review.application.QuizReviewService;
import com.studyflow.review.application.QuizSummaryDTO;
import com.studyflow.review.application.StartQuizAttemptResult;
import com.studyflow.review.application.SubmitQuizAttemptCommand;
import com.studyflow.review.application.SubmitQuizAttemptResult;
import com.studyflow.review.application.WrongAnswerReviewItemDTO;
import com.studyflow.review.domain.QuizStatus;
import com.studyflow.review.dto.CourseOfferingReviewSummaryDTO;
import com.studyflow.review.dto.SubmitQuizAttemptRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StudentQuizReviewControllerTest {

    private static final UUID STUDENT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID QUIZ_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OFFERING_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID ATTEMPT_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID QUESTION_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private QuizReviewService quizReviewService;

    @Mock
    private QuizAttemptService quizAttemptService;

    private Jwt mockJwt;

    @BeforeEach
    void setUp() {
        StudentQuizReviewController controller = new StudentQuizReviewController(quizReviewService, quizAttemptService);

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

        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setObjectMapper(objectMapper);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(jwtResolver)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(converter)
                .build();
    }

    @Test
    @DisplayName("POST /quizzes/{id}/attempts starts attempt and returns 201 without answers")
    void startAttemptSuccess() throws Exception {
        QuizQuestionTakingDTO q = new QuizQuestionTakingDTO(
                QUESTION_ID,
                1,
                "Khái niệm khóa chính?",
                List.of(new QuestionOptionDTO(0, "Tùy chọn A"), new QuestionOptionDTO(1, "Tùy chọn B"))
        );
        StartQuizAttemptResult result = new StartQuizAttemptResult(
                ATTEMPT_ID, QUIZ_ID, "Quiz CSDL", Instant.now(), 1, List.of(q)
        );

        when(quizAttemptService.startAttempt(QUIZ_ID, STUDENT_ID)).thenReturn(result);

        mockMvc.perform(post("/api/v1/review/quizzes/{id}/attempts", QUIZ_ID))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.attemptId").value(ATTEMPT_ID.toString()))
                .andExpect(jsonPath("$.quizId").value(QUIZ_ID.toString()))
                .andExpect(jsonPath("$.totalQuestions").value(1))
                .andExpect(jsonPath("$.questions[0].id").value(QUESTION_ID.toString()))
                .andExpect(jsonPath("$.questions[0].correctOptionIndex").doesNotExist());
    }

    @Test
    @DisplayName("POST /attempts/{id}/submit scores answers and returns 200 with citations")
    void submitAttemptSuccess() throws Exception {
        SubmitQuizAttemptRequest request = new SubmitQuizAttemptRequest(Map.of(QUESTION_ID, 0));

        QuizQuestionReviewDTO review = new QuizQuestionReviewDTO(
                QUESTION_ID,
                1,
                "Khái niệm khóa chính?",
                List.of(new QuestionOptionDTO(0, "Tùy chọn A"), new QuestionOptionDTO(1, "Tùy chọn B")),
                0,
                0,
                true,
                "Giải thích chi tiết",
                List.of(new QuizCitationSourceDTO(UUID.randomUUID(), 3, "Trích đoạn trang 3"))
        );

        SubmitQuizAttemptResult result = new SubmitQuizAttemptResult(
                ATTEMPT_ID,
                QUIZ_ID,
                new BigDecimal("100.00"),
                1,
                1,
                Instant.now(),
                List.of(review)
        );

        when(quizAttemptService.submitAttempt(any())).thenReturn(result);

        mockMvc.perform(post("/api/v1/review/attempts/{id}/submit", ATTEMPT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(100.00))
                .andExpect(jsonPath("$.correctAnswersCount").value(1))
                .andExpect(jsonPath("$.questionReviews[0].isCorrect").value(true))
                .andExpect(jsonPath("$.questionReviews[0].citations[0].pageNumber").value(3));

        ArgumentCaptor<SubmitQuizAttemptCommand> captor = ArgumentCaptor.forClass(SubmitQuizAttemptCommand.class);
        verify(quizAttemptService).submitAttempt(captor.capture());
        assertThat(captor.getValue().attemptId()).isEqualTo(ATTEMPT_ID);
        assertThat(captor.getValue().selectedAnswers().get(QUESTION_ID)).isEqualTo(0);
    }

    @Test
    @DisplayName("GET /course-offerings/{id} returns quizzes and wrong-answer review items")
    void getCourseOfferingReviewSuccess() throws Exception {
        QuizSummaryDTO quiz = new QuizSummaryDTO(
                QUIZ_ID, "Quiz CSDL", "Mô tả", QuizStatus.READY, OFFERING_ID, 5, Instant.now(), 2, new BigDecimal("80.00")
        );
        WrongAnswerReviewItemDTO wrongItem = new WrongAnswerReviewItemDTO(
                QUESTION_ID,
                "Câu hỏi sai?",
                1,
                "Đáp án học sinh chọn",
                0,
                "Đáp án đúng",
                "Giải thích",
                List.of(new QuizCitationSourceDTO(UUID.randomUUID(), 10, "Trích đoạn")),
                Instant.now()
        );

        when(quizReviewService.getCourseQuizzes(OFFERING_ID, STUDENT_ID)).thenReturn(List.of(quiz));
        when(quizReviewService.getWrongAnswerReviewItems(OFFERING_ID, STUDENT_ID)).thenReturn(List.of(wrongItem));

        mockMvc.perform(get("/api/v1/review/course-offerings/{id}", OFFERING_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseOfferingId").value(OFFERING_ID.toString()))
                .andExpect(jsonPath("$.quizzes[0].title").value("Quiz CSDL"))
                .andExpect(jsonPath("$.reviewItems[0].questionId").value(QUESTION_ID.toString()));
    }

    @Test
    @DisplayName("GET /personal-quizzes returns student's personal quizzes")
    void getPersonalQuizzesSuccess() throws Exception {
        QuizSummaryDTO quiz = new QuizSummaryDTO(
                QUIZ_ID, "Quiz cá nhân", null, QuizStatus.READY, null, 3, Instant.now(), 1, new BigDecimal("90.00")
        );
        when(quizReviewService.getPersonalQuizzes(STUDENT_ID)).thenReturn(List.of(quiz));

        mockMvc.perform(get("/api/v1/review/personal-quizzes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(QUIZ_ID.toString()))
                .andExpect(jsonPath("$[0].title").value("Quiz cá nhân"));
    }

    @Test
    @DisplayName("GET /course-offerings returns enrolled offerings review summaries")
    void getCourseOfferingsReviewSuccess() throws Exception {
        CourseOfferingReviewSummaryDTO summary = new CourseOfferingReviewSummaryDTO(
                OFFERING_ID, 3, new BigDecimal("75.50"), Instant.now()
        );
        when(quizReviewService.getEnrolledCourseOfferingsReview(STUDENT_ID)).thenReturn(List.of(summary));

        mockMvc.perform(get("/api/v1/review/course-offerings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseOfferingId").value(OFFERING_ID.toString()))
                .andExpect(jsonPath("$[0].quizCount").value(3))
                .andExpect(jsonPath("$[0].averageScore").value(75.50));
    }
}
