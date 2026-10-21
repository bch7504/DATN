package com.studyflow.courseoffering.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.SemesterStatus;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.api.GlobalExceptionHandler;
import com.studyflow.courseoffering.application.CourseOfferingService;
import com.studyflow.courseoffering.application.CreateCourseOfferingCommand;
import com.studyflow.courseoffering.application.CreatedCourseOfferingResult;
import com.studyflow.courseoffering.application.UpdateCourseOfferingCommand;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.dto.CreateCourseOfferingRequest;
import com.studyflow.courseoffering.dto.ToggleJoinCodeRequest;
import com.studyflow.courseoffering.dto.UpdateCourseOfferingRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TeacherCourseOfferingControllerTest {

    private static final UUID TEACHER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SUBJECT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID SEMESTER_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID OFFERING_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CourseOfferingService offeringService;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private SemesterRepository semesterRepository;

    private Jwt mockJwt;

    /**
     * Args: none; uses synthetic Teacher identity and mocked repositories/service.
     * Input: standalone MVC request context with Bean Validation and the public error handler.
     * Output: void; prepares an authenticated controller fixture for each test.
     * Errors: fixture setup fails the test if validation cannot initialize.
     */
    @BeforeEach
    void setUp() {
        TeacherCourseOfferingController controller = new TeacherCourseOfferingController(
                offeringService, subjectRepository, semesterRepository
        );

        mockJwt = Jwt.withTokenValue("mock-jwt-token")
                .header("alg", "none")
                .subject(TEACHER_ID.toString())
                .claim("role", "TEACHER")
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

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(jwtResolver)
                .setValidator(validator)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Teacher creates course offering and receives 201 Created with raw join code")
    void teacherCanCreateOffering() throws Exception {
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "Cơ sở dữ liệu", "hash123", "CD12"
        );
        CreatedCourseOfferingResult result = new CreatedCourseOfferingResult(offering, "INT1340-ABCD12");

        Subject subject = new Subject(SUBJECT_ID, "INT1340", "Cơ sở dữ liệu", 3, "CSDL", "ACTIVE");
        Semester semester = new Semester(SEMESTER_ID, "2026_1", "Học kỳ 1", "2026-2027",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 15), SemesterStatus.ACTIVE, true);

        when(offeringService.createCourseOffering(eq(TEACHER_ID), any(CreateCourseOfferingCommand.class)))
                .thenReturn(result);
        when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(subject));
        when(semesterRepository.findById(SEMESTER_ID)).thenReturn(Optional.of(semester));

        CreateCourseOfferingRequest req = new CreateCourseOfferingRequest(
                SUBJECT_ID, SEMESTER_ID, "DBI-01", "Cơ sở dữ liệu"
        );

        mockMvc.perform(post("/api/v1/teacher/course-offerings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("DBI-01"))
                .andExpect(jsonPath("$.rawJoinCode").value("INT1340-ABCD12"))
                .andExpect(jsonPath("$.joinCodeHint").value("CD12"));
    }

    /**
     * Args: none; submits synthetic catalog IDs and omits the optional name.
     * Input: valid authenticated POST body with a custom class code.
     * Output: void; verifies HTTP 201 response schema and a null name passed to the service.
     * Errors: fails on unexpected validation or response mismatch.
     */
    @Test
    @DisplayName("Teacher can omit the optional class name and receive a created offering")
    void teacherCanCreateOfferingWithoutName() throws Exception {
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "BAS1157", "Tiếng Anh (Course 1) (BAS1157)", "hash123", "CD12"
        );
        when(offeringService.createCourseOffering(eq(TEACHER_ID), any(CreateCourseOfferingCommand.class)))
                .thenReturn(new CreatedCourseOfferingResult(offering, "BAS1157-ABCD12"));

        mockMvc.perform(post("/api/v1/teacher/course-offerings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subjectId\":\"" + SUBJECT_ID + "\",\"semesterId\":\"" + SEMESTER_ID
                                + "\",\"code\":\"BAS1157\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("BAS1157"))
                .andExpect(jsonPath("$.name").value("Tiếng Anh (Course 1) (BAS1157)"))
                .andExpect(jsonPath("$.rawJoinCode").value("BAS1157-ABCD12"));

        verify(offeringService).createCourseOffering(eq(TEACHER_ID),
                argThat(command -> "BAS1157".equals(command.code()) && command.name() == null));
    }

    /**
     * Args: none; submits a synthetic request missing a required catalog ID.
     * Input: authenticated POST body without subjectId.
     * Output: void; verifies HTTP 422 with a field-specific error envelope.
     * Errors: fails if invalid input reaches the application service.
     */
    @Test
    @DisplayName("Teacher create request still rejects a missing subject ID")
    void teacherCannotCreateOfferingWithoutSubject() throws Exception {
        mockMvc.perform(post("/api/v1/teacher/course-offerings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"semesterId\":\"" + SEMESTER_ID + "\",\"code\":\"BAS1157\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.details[0].field").value("subjectId"));
    }

    @Test
    @DisplayName("Teacher lists course offerings with status filter")
    void teacherCanListOfferings() throws Exception {
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "Cơ sở dữ liệu", "hash123", "CD12"
        );
        Subject subject = new Subject(SUBJECT_ID, "INT1340", "Cơ sở dữ liệu", 3, "CSDL", "ACTIVE");
        Semester semester = new Semester(SEMESTER_ID, "2026_1", "Học kỳ 1", "2026-2027",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 15), SemesterStatus.ACTIVE, true);

        when(offeringService.getTeacherOfferings(TEACHER_ID, null, null))
                .thenReturn(List.of(offering));
        when(subjectRepository.findAllById(List.of(SUBJECT_ID))).thenReturn(List.of(subject));
        when(semesterRepository.findAllById(List.of(SEMESTER_ID))).thenReturn(List.of(semester));

        mockMvc.perform(get("/api/v1/teacher/course-offerings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].code").value("DBI-01"))
                .andExpect(jsonPath("$[0].rawJoinCode").doesNotExist());
    }

    @Test
    @DisplayName("Teacher regenerates join code successfully")
    void teacherCanRegenerateJoinCode() throws Exception {
        CourseOffering updated = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "Cơ sở dữ liệu", "new_hash", "EF34"
        );
        when(offeringService.regenerateJoinCode(TEACHER_ID, OFFERING_ID)).thenReturn("INT1340-WXYZ34");
        when(offeringService.getOfferingById(OFFERING_ID)).thenReturn(updated);

        mockMvc.perform(post("/api/v1/teacher/course-offerings/" + OFFERING_ID + "/join-code/regenerate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rawJoinCode").value("INT1340-WXYZ34"))
                .andExpect(jsonPath("$.joinCodeHint").value("EF34"));
    }

    @Test
    @DisplayName("Teacher updates offering metadata with PATCH")
    void teacherCanUpdateOfferingMetadata() throws Exception {
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-02", "CSDL mới", "hash123", "CD12"
        );
        when(offeringService.updateCourseOffering(
                eq(TEACHER_ID), eq(OFFERING_ID), any(UpdateCourseOfferingCommand.class)
        )).thenReturn(offering);
        when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.empty());
        when(semesterRepository.findById(SEMESTER_ID)).thenReturn(Optional.empty());

        UpdateCourseOfferingRequest req = new UpdateCourseOfferingRequest("DBI-02", "CSDL mới");

        mockMvc.perform(patch("/api/v1/teacher/course-offerings/" + OFFERING_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("DBI-02"))
                .andExpect(jsonPath("$.name").value("CSDL mới"))
                .andExpect(jsonPath("$.rawJoinCode").doesNotExist());
    }
}
