package com.studyflow.courseoffering.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.SemesterStatus;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.security.UserPrincipal;
import com.studyflow.common.security.UserRole;
import com.studyflow.courseoffering.application.CourseOfferingService;
import com.studyflow.courseoffering.application.CreateCourseOfferingCommand;
import com.studyflow.courseoffering.application.CreatedCourseOfferingResult;
import com.studyflow.courseoffering.application.UpdateCourseOfferingCommand;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.dto.CreateCourseOfferingRequest;
import com.studyflow.courseoffering.dto.ToggleJoinCodeRequest;
import com.studyflow.courseoffering.dto.UpdateCourseOfferingRequest;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TeacherCourseOfferingControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CourseOfferingService offeringService;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private SemesterRepository semesterRepository;

    private UserPrincipal teacherPrincipal;

    @BeforeEach
    void setUp() {
        TeacherCourseOfferingController controller = new TeacherCourseOfferingController(
                offeringService, subjectRepository, semesterRepository
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        teacherPrincipal = UserPrincipal.builder()
                .id("usr_teacher_01")
                .email("teacher@ptit.edu.vn")
                .displayName("Giảng viên PTIT")
                .role(UserRole.TEACHER)
                .build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(teacherPrincipal, "password", teacherPrincipal.getAuthorities())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Teacher creates course offering and receives 201 Created with raw join code")
    void teacherCanCreateOffering() throws Exception {
        CourseOffering offering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "usr_teacher_01",
                "DBI-01", "Cơ sở dữ liệu", "hash123", "CD12"
        );
        CreatedCourseOfferingResult result = new CreatedCourseOfferingResult(offering, "INT1340-ABCD12");

        Subject subject = new Subject("subj_dbi", "INT1340", "Cơ sở dữ liệu", 3, "CSDL", "ACTIVE");
        Semester semester = new Semester("sem_2026_1", "2026_1", "Học kỳ 1", "2026-2027",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 15), SemesterStatus.ACTIVE, true);

        when(offeringService.createCourseOffering(eq("usr_teacher_01"), any(CreateCourseOfferingCommand.class)))
                .thenReturn(result);
        when(subjectRepository.findById("subj_dbi")).thenReturn(Optional.of(subject));
        when(semesterRepository.findById("sem_2026_1")).thenReturn(Optional.of(semester));

        CreateCourseOfferingRequest req = new CreateCourseOfferingRequest(
                "subj_dbi", "sem_2026_1", "DBI-01", "Cơ sở dữ liệu"
        );

        mockMvc.perform(post("/api/v1/teacher/course-offerings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("off_01"))
                .andExpect(jsonPath("$.code").value("DBI-01"))
                .andExpect(jsonPath("$.rawJoinCode").value("INT1340-ABCD12"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("Teacher lists course offerings and receives 200 OK")
    void teacherCanListOfferings() throws Exception {
        CourseOffering offering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "usr_teacher_01",
                "DBI-01", "Cơ sở dữ liệu", "hash123", "CD12"
        );
        Subject subject = new Subject("subj_dbi", "INT1340", "Cơ sở dữ liệu", 3, "CSDL", "ACTIVE");
        Semester semester = new Semester("sem_2026_1", "2026_1", "Học kỳ 1", "2026-2027",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 15), SemesterStatus.ACTIVE, true);

        when(offeringService.getTeacherOfferings(eq("usr_teacher_01"), any(), any()))
                .thenReturn(List.of(offering));
        when(subjectRepository.findAllById(List.of("subj_dbi"))).thenReturn(List.of(subject));
        when(semesterRepository.findAllById(List.of("sem_2026_1"))).thenReturn(List.of(semester));

        mockMvc.perform(get("/api/v1/teacher/course-offerings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("off_01"))
                .andExpect(jsonPath("$[0].code").value("DBI-01"));
    }

    @Test
    @DisplayName("Teacher toggles join code availability and receives 200 OK")
    void teacherCanToggleJoinCode() throws Exception {
        CourseOffering offering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "usr_teacher_01",
                "DBI-01", "Cơ sở dữ liệu", "hash123", "CD12"
        );
        offering.toggleJoinCode(false);

        when(offeringService.toggleJoinCode("usr_teacher_01", "off_01", false))
                .thenReturn(offering);
        when(subjectRepository.findById("subj_dbi")).thenReturn(Optional.empty());
        when(semesterRepository.findById("sem_2026_1")).thenReturn(Optional.empty());

        ToggleJoinCodeRequest req = new ToggleJoinCodeRequest(false);

        mockMvc.perform(patch("/api/v1/teacher/course-offerings/off_01/join-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joinCodeActive").value(false));
    }

    @Test
    @DisplayName("Teacher updates offering metadata with PATCH")
    void teacherCanUpdateOfferingMetadata() throws Exception {
        CourseOffering offering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "usr_teacher_01",
                "DBI-02", "CSDL mới", "hash123", "CD12"
        );
        when(offeringService.updateCourseOffering(
                eq("usr_teacher_01"), eq("off_01"), any(UpdateCourseOfferingCommand.class)
        )).thenReturn(offering);
        when(subjectRepository.findById("subj_dbi")).thenReturn(Optional.empty());
        when(semesterRepository.findById("sem_2026_1")).thenReturn(Optional.empty());

        UpdateCourseOfferingRequest req = new UpdateCourseOfferingRequest();
        req.setCode("DBI-02");
        req.setName("CSDL mới");

        mockMvc.perform(patch("/api/v1/teacher/course-offerings/off_01")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("DBI-02"))
                .andExpect(jsonPath("$.name").value("CSDL mới"))
                .andExpect(jsonPath("$.rawJoinCode").doesNotExist());
    }
}
