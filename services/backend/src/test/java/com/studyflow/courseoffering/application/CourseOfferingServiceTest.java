package com.studyflow.courseoffering.application;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.SemesterStatus;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseOfferingServiceTest {

    @Mock
    private CourseOfferingRepository offeringRepository;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private SemesterRepository semesterRepository;

    private CourseOfferingService offeringService;

    private Subject mockSubject;
    private Semester mockSemester;

    @BeforeEach
    void setUp() {
        offeringService = new CourseOfferingService(offeringRepository, subjectRepository, semesterRepository);

        mockSubject = new Subject("subj_dbi", "INT1340", "Cơ sở dữ liệu", 3, "Mô tả CSDL", "ACTIVE");
        mockSemester = new Semester("sem_2026_1", "2026_1", "Học kỳ 1 2026-2027", "2026-2027",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 15),
                SemesterStatus.ACTIVE, true);
    }

    @Test
    @DisplayName("Should successfully create Course Offering and return plain join code")
    void shouldCreateCourseOfferingSuccessfully() {
        when(subjectRepository.findById("subj_dbi")).thenReturn(Optional.of(mockSubject));
        when(semesterRepository.findById("sem_2026_1")).thenReturn(Optional.of(mockSemester));
        when(offeringRepository.existsBySemesterIdAndCode("sem_2026_1", "DBI-01")).thenReturn(false);
        when(offeringRepository.save(any(CourseOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateCourseOfferingCommand cmd = new CreateCourseOfferingCommand(
                "subj_dbi", "sem_2026_1", "DBI-01", "Cơ sở dữ liệu - Lớp 01"
        );

        CreatedCourseOfferingResult result = offeringService.createCourseOffering("teacher_01", cmd);

        assertNotNull(result);
        assertNotNull(result.getRawJoinCode());
        assertTrue(result.getRawJoinCode().startsWith("INT1340-"));
        assertEquals("DBI-01", result.getOffering().getCode());
        assertEquals("teacher_01", result.getOffering().getTeacherId());
        assertEquals(CourseOfferingStatus.ACTIVE, result.getOffering().getStatus());
        assertTrue(result.getOffering().isJoinEnabled());

        verify(offeringRepository, times(1)).save(any(CourseOffering.class));
    }

    @Test
    @DisplayName("Should reject creating offering when semester is CLOSED")
    void shouldRejectWhenSemesterNotActive() {
        mockSemester.setStatus(SemesterStatus.CLOSED);
        when(subjectRepository.findById("subj_dbi")).thenReturn(Optional.of(mockSubject));
        when(semesterRepository.findById("sem_2026_1")).thenReturn(Optional.of(mockSemester));

        CreateCourseOfferingCommand cmd = new CreateCourseOfferingCommand(
                "subj_dbi", "sem_2026_1", "DBI-01", "Lớp CSDL"
        );

        ConflictException ex = assertThrows(ConflictException.class, () ->
                offeringService.createCourseOffering("teacher_01", cmd)
        );
        assertEquals("SEMESTER_NOT_ACTIVE", ex.getErrorCode());
        verify(offeringRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject creating offering when code already exists in semester")
    void shouldRejectDuplicateOfferingCode() {
        when(subjectRepository.findById("subj_dbi")).thenReturn(Optional.of(mockSubject));
        when(semesterRepository.findById("sem_2026_1")).thenReturn(Optional.of(mockSemester));
        when(offeringRepository.existsBySemesterIdAndCode("sem_2026_1", "DBI-01")).thenReturn(true);

        CreateCourseOfferingCommand cmd = new CreateCourseOfferingCommand(
                "subj_dbi", "sem_2026_1", "DBI-01", "Lớp CSDL"
        );

        ConflictException ex = assertThrows(ConflictException.class, () ->
                offeringService.createCourseOffering("teacher_01", cmd)
        );
        assertEquals("COURSE_CODE_EXISTS", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should regenerate Join Code when teacher owns the class")
    void shouldRegenerateJoinCode() {
        CourseOffering offering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "teacher_01",
                "DBI-01", "CSDL", "old_hash", "OLD1"
        );
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(offering));

        String newRawCode = offeringService.regenerateJoinCode("teacher_01", "off_01");

        assertNotNull(newRawCode);
        assertNotEquals("old_hash", offering.getJoinCodeHash());
        verify(offeringRepository, times(1)).save(offering);
    }

    @Test
    @DisplayName("Should forbid other teacher from regenerating join code")
    void shouldForbidNonOwnerRegeneratingJoinCode() {
        CourseOffering offering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "teacher_01",
                "DBI-01", "CSDL", "old_hash", "OLD1"
        );
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(offering));

        assertThrows(ForbiddenException.class, () ->
                offeringService.regenerateJoinCode("intruder_teacher", "off_01")
        );
        verify(offeringRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should toggle join enabled flag")
    void shouldToggleJoinCode() {
        CourseOffering offering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "teacher_01",
                "DBI-01", "CSDL", "hash", "HINT"
        );
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(offering));
        when(offeringRepository.save(any(CourseOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        CourseOffering result = offeringService.toggleJoinCode("teacher_01", "off_01", false);
        assertFalse(result.isJoinEnabled());

        verify(offeringRepository, times(1)).save(offering);
    }

    @Test
    @DisplayName("Should generate the first code per subject and semester")
    void shouldGenerateCodePerSubjectAndSemester() {
        when(subjectRepository.findById("subj_dbi")).thenReturn(Optional.of(mockSubject));
        when(semesterRepository.findById("sem_2026_1")).thenReturn(Optional.of(mockSemester));
        when(offeringRepository.countBySubjectIdAndSemesterId("subj_dbi", "sem_2026_1"))
                .thenReturn(0L);
        when(offeringRepository.existsBySemesterIdAndCode("sem_2026_1", "INT1340_01"))
                .thenReturn(false);
        when(offeringRepository.save(any(CourseOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        CreatedCourseOfferingResult result = offeringService.createCourseOffering(
                "teacher_01",
                new CreateCourseOfferingCommand("subj_dbi", "sem_2026_1", null, null)
        );

        assertEquals("INT1340_01", result.getOffering().getCode());
        verify(offeringRepository).countBySubjectIdAndSemesterId("subj_dbi", "sem_2026_1");
    }

    @Test
    @DisplayName("Should update metadata for the owner")
    void shouldUpdateMetadataForOwner() {
        CourseOffering offering = new CourseOffering(
                "off_01", "subj_dbi", "sem_2026_1", "teacher_01",
                "DBI-01", "CSDL", "hash", "HINT"
        );
        when(offeringRepository.findById("off_01")).thenReturn(Optional.of(offering));
        when(offeringRepository.existsBySemesterIdAndCodeAndIdNot("sem_2026_1", "DBI-02", "off_01"))
                .thenReturn(false);
        when(offeringRepository.save(offering)).thenReturn(offering);

        CourseOffering result = offeringService.updateCourseOffering(
                "teacher_01", "off_01", new UpdateCourseOfferingCommand("dbi-02", " CSDL mới ")
        );

        assertSame(offering, result);
        assertEquals("DBI-02", result.getCode());
        assertEquals("CSDL mới", result.getName());
    }

    @Test
    @DisplayName("Should reject an empty metadata patch")
    void shouldRejectEmptyMetadataPatch() {
        ValidationException ex = assertThrows(ValidationException.class, () ->
                offeringService.updateCourseOffering(
                        "teacher_01", "off_01", new UpdateCourseOfferingCommand(" ", null)
                )
        );

        assertEquals("NO_FIELDS_TO_UPDATE", ex.getErrorCode());
        verifyNoInteractions(offeringRepository);
    }
}
