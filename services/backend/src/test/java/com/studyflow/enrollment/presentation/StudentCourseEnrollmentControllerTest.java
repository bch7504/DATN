package com.studyflow.enrollment.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.application.CourseEnrollmentService;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.dto.JoinCourseRequest;
import com.studyflow.user.domain.UserAccount;
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
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StudentCourseEnrollmentControllerTest {

    private static final UUID STUDENT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TEACHER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID SUBJECT_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID SEMESTER_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID OFFERING_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID ENROLLMENT_ID = UUID.fromString("66666666-6666-6666-6666-666666666666");

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CourseEnrollmentService enrollmentService;

    @Mock
    private CourseOfferingRepository offeringRepository;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private SemesterRepository semesterRepository;

    @Mock
    private UserAccountStore userAccountStore;

    private Jwt mockJwt;

    @BeforeEach
    void setUp() {
        StudentCourseEnrollmentController controller = new StudentCourseEnrollmentController(
                enrollmentService, offeringRepository, subjectRepository, semesterRepository, userAccountStore
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

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(jwtResolver)
                .build();
    }

    @Test
    @DisplayName("Student requests enrollment with valid join code and receives 201 Created")
    void studentCanJoinCourse() throws Exception {
        CourseEnrollment enrollment = new CourseEnrollment(ENROLLMENT_ID, OFFERING_ID, STUDENT_ID);
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "Cơ sở dữ liệu", "hash", "CD12"
        );
        Subject subject = new Subject(SUBJECT_ID, "INT1340", "Cơ sở dữ liệu", 3, "CSDL", "ACTIVE");

        when(enrollmentService.joinByCode(eq(STUDENT_ID), eq("INT1340-ABCD12"))).thenReturn(enrollment);
        when(offeringRepository.findById(OFFERING_ID)).thenReturn(Optional.of(offering));
        when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(subject));
        when(semesterRepository.findById(SEMESTER_ID)).thenReturn(Optional.empty());
        when(userAccountStore.findById(TEACHER_ID)).thenReturn(Optional.empty());

        JoinCourseRequest req = new JoinCourseRequest("INT1340-ABCD12");

        mockMvc.perform(post("/api/v1/student/course-enrollments/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.courseCode").value("DBI-01"))
                .andExpect(jsonPath("$.subjectName").value("Cơ sở dữ liệu"));
    }

    @Test
    @DisplayName("Student lists own enrollments")
    void studentCanListEnrollments() throws Exception {
        CourseEnrollment enrollment = new CourseEnrollment(ENROLLMENT_ID, OFFERING_ID, STUDENT_ID);
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "Cơ sở dữ liệu", "hash", "CD12"
        );
        Subject subject = new Subject(SUBJECT_ID, "INT1340", "Cơ sở dữ liệu", 3, "CSDL", "ACTIVE");

        when(enrollmentService.getStudentEnrollments(STUDENT_ID, null, null))
                .thenReturn(List.of(enrollment));
        when(offeringRepository.findAllById(List.of(OFFERING_ID))).thenReturn(List.of(offering));
        when(subjectRepository.findAllById(List.of(SUBJECT_ID))).thenReturn(List.of(subject));
        when(semesterRepository.findAllById(List.of(SEMESTER_ID))).thenReturn(List.of());
        when(userAccountStore.findAllByIdIn(List.of(TEACHER_ID))).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/student/course-enrollments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].courseCode").value("DBI-01"));
    }
}
