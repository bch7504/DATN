package com.studyflow.enrollment.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.security.UserPrincipal;
import com.studyflow.common.security.UserRole;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.application.CourseEnrollmentService;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.dto.JoinCourseRequest;
import com.studyflow.user.domain.User;
import com.studyflow.user.domain.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StudentCourseEnrollmentControllerTest {

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
    private UserRepository userRepository;

    private UserPrincipal studentPrincipal;

    @BeforeEach
    void setUp() {
        StudentCourseEnrollmentController controller = new StudentCourseEnrollmentController(
                enrollmentService, offeringRepository, subjectRepository, semesterRepository, userRepository
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        studentPrincipal = UserPrincipal.builder()
                .id("usr_student_01")
                .email("student@ptit.edu.vn")
                .displayName("Sinh viên PTIT")
                .role(UserRole.STUDENT)
                .build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(studentPrincipal, "password", studentPrincipal.getAuthorities())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Student joins course with join code and receives 201 Created with PENDING status")
    void studentCanJoinCourse() throws Exception {
        CourseEnrollment enrollment = new CourseEnrollment("enr_01", "off_01", "usr_student_01");
        CourseOffering offering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "teacher_01",
                "DBI-01", "Cơ sở dữ liệu", "hash123", "CD12"
        );

        when(enrollmentService.joinByCode(eq("usr_student_01"), eq("INT1340-ABCD12")))
                .thenReturn(enrollment);
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(offering));
        when(subjectRepository.findById("subj_dbi")).thenReturn(Optional.empty());
        when(semesterRepository.findById("sem_2026_1")).thenReturn(Optional.empty());
        when(userRepository.findById("teacher_01")).thenReturn(Optional.empty());

        JoinCourseRequest req = new JoinCourseRequest("INT1340-ABCD12");

        mockMvc.perform(post("/api/v1/student/course-enrollments/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("enr_01"))
                .andExpect(jsonPath("$.courseOfferingId").value("off_01"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Student lists enrollments and receives 200 OK")
    void studentCanListEnrollments() throws Exception {
        CourseEnrollment enrollment = new CourseEnrollment("enr_01", "off_01", "usr_student_01");
        when(enrollmentService.getStudentEnrollments(eq("usr_student_01"), eq(null), any()))
                .thenReturn(List.of(enrollment));
        when(offeringRepository.findAllById(List.of("off_01"))).thenReturn(List.of());
        when(subjectRepository.findAllById(List.of())).thenReturn(List.of());
        when(semesterRepository.findAllById(List.of())).thenReturn(List.of());
        when(userRepository.findAllById(List.of())).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/student/course-enrollments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("enr_01"))
                .andExpect(jsonPath("$[0].courseOfferingId").value("off_01"));
    }
}
