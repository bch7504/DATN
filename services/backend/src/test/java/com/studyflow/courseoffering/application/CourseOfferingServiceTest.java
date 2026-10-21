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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseOfferingServiceTest {

    private static final UUID TEACHER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER_TEACHER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID SUBJECT_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID SEMESTER_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID OFFERING_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");

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

        mockSubject = new Subject(SUBJECT_ID, "INT1340", "Cơ sở dữ liệu", 3, "Mô tả CSDL", "ACTIVE");
        mockSemester = new Semester(SEMESTER_ID, "2026_1", "Học kỳ 1 2026-2027", "2026-2027",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 15),
                SemesterStatus.ACTIVE, true);
    }

    @Test
    @DisplayName("Should successfully create Course Offering and return plain join code")
    void shouldCreateCourseOfferingSuccessfully() {
        when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(mockSubject));
        when(semesterRepository.findById(SEMESTER_ID)).thenReturn(Optional.of(mockSemester));
        when(offeringRepository.existsBySemesterIdAndCode(SEMESTER_ID, "DBI-01")).thenReturn(false);
        when(offeringRepository.save(any(CourseOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateCourseOfferingCommand cmd = new CreateCourseOfferingCommand(
                SUBJECT_ID, SEMESTER_ID, "DBI-01", "Cơ sở dữ liệu - Lớp 01"
        );

        CreatedCourseOfferingResult result = offeringService.createCourseOffering(TEACHER_ID, cmd);

        assertNotNull(result);
        assertNotNull(result.getRawJoinCode());
        assertTrue(result.getRawJoinCode().startsWith("INT1340-"));
        assertEquals("DBI-01", result.getOffering().getCode());
        assertEquals(TEACHER_ID, result.getOffering().getTeacherId());
        assertEquals(CourseOfferingStatus.ACTIVE, result.getOffering().getStatus());
        assertTrue(result.getOffering().isJoinEnabled());

        verify(offeringRepository, times(1)).save(any(CourseOffering.class));
    }

    @Test
    @DisplayName("Should reject creating offering when semester is CLOSED")
    void shouldRejectWhenSemesterNotActive() {
        mockSemester.setStatus(SemesterStatus.CLOSED);
        when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(mockSubject));
        when(semesterRepository.findById(SEMESTER_ID)).thenReturn(Optional.of(mockSemester));

        CreateCourseOfferingCommand cmd = new CreateCourseOfferingCommand(
                SUBJECT_ID, SEMESTER_ID, "DBI-01", "Lớp CSDL"
        );

        ConflictException ex = assertThrows(ConflictException.class, () ->
                offeringService.createCourseOffering(TEACHER_ID, cmd)
        );
        assertEquals("SEMESTER_NOT_ACTIVE", ex.getErrorCode());
        verify(offeringRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject creating offering when code already exists in semester")
    void shouldRejectDuplicateOfferingCode() {
        when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(mockSubject));
        when(semesterRepository.findById(SEMESTER_ID)).thenReturn(Optional.of(mockSemester));
        when(offeringRepository.existsBySemesterIdAndCode(SEMESTER_ID, "DBI-01")).thenReturn(true);

        CreateCourseOfferingCommand cmd = new CreateCourseOfferingCommand(
                SUBJECT_ID, SEMESTER_ID, "DBI-01", "Lớp CSDL"
        );

        ConflictException ex = assertThrows(ConflictException.class, () ->
                offeringService.createCourseOffering(TEACHER_ID, cmd)
        );
        assertEquals("COURSE_CODE_EXISTS", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should regenerate Join Code when teacher owns the class")
    void shouldRegenerateJoinCode() {
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "CSDL", "old_hash", "OLD1"
        );
        when(offeringRepository.findById(OFFERING_ID)).thenReturn(Optional.of(offering));

        String newRawCode = offeringService.regenerateJoinCode(TEACHER_ID, OFFERING_ID);

        assertNotNull(newRawCode);
        assertNotEquals("old_hash", offering.getJoinCodeHash());
        verify(offeringRepository, times(1)).save(offering);
    }

    @Test
    @DisplayName("Should forbid other teacher from regenerating join code")
    void shouldForbidNonOwnerRegeneratingJoinCode() {
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "CSDL", "old_hash", "OLD1"
        );
        when(offeringRepository.findById(OFFERING_ID)).thenReturn(Optional.of(offering));

        assertThrows(ForbiddenException.class, () ->
                offeringService.regenerateJoinCode(OTHER_TEACHER_ID, OFFERING_ID)
        );
        verify(offeringRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should toggle join enabled flag")
    void shouldToggleJoinCode() {
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "CSDL", "hash", "HINT"
        );
        when(offeringRepository.findById(OFFERING_ID)).thenReturn(Optional.of(offering));
        when(offeringRepository.save(any(CourseOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        CourseOffering result = offeringService.toggleJoinCode(TEACHER_ID, OFFERING_ID, false);
        assertFalse(result.isJoinEnabled());

        verify(offeringRepository, times(1)).save(offering);
    }

    @Test
    @DisplayName("Should generate the first code per subject and semester")
    void shouldGenerateCodePerSubjectAndSemester() {
        when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(mockSubject));
        when(semesterRepository.findById(SEMESTER_ID)).thenReturn(Optional.of(mockSemester));
        when(offeringRepository.countBySubjectIdAndSemesterId(SUBJECT_ID, SEMESTER_ID))
                .thenReturn(0L);
        when(offeringRepository.existsBySemesterIdAndCode(SEMESTER_ID, "INT1340_01"))
                .thenReturn(false);
        when(offeringRepository.save(any(CourseOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        CreatedCourseOfferingResult result = offeringService.createCourseOffering(
                TEACHER_ID,
                new CreateCourseOfferingCommand(SUBJECT_ID, SEMESTER_ID, null, null)
        );

        assertEquals("INT1340_01", result.getOffering().getCode());
        verify(offeringRepository).countBySubjectIdAndSemesterId(SUBJECT_ID, SEMESTER_ID);
    }

    /**
     * Args: none; uses synthetic subject, semester and Teacher IDs from this fixture.
     * Input: an active semester, a custom class code and no optional class name.
     * Output: void; asserts the saved class gets the subject-based default name.
     * Errors: fails if creation rejects the optional name or persists an empty name.
     */
    @Test
    @DisplayName("Should default the class name when Teacher only supplies a code")
    void shouldDefaultNameWhenOnlyCodeProvided() {
        when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(mockSubject));
        when(semesterRepository.findById(SEMESTER_ID)).thenReturn(Optional.of(mockSemester));
        when(offeringRepository.save(any(CourseOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        CreatedCourseOfferingResult result = offeringService.createCourseOffering(
                TEACHER_ID,
                new CreateCourseOfferingCommand(SUBJECT_ID, SEMESTER_ID, "INT1340", null)
        );

        assertEquals("INT1340", result.getOffering().getCode());
        assertEquals("Cơ sở dữ liệu (INT1340)", result.getOffering().getName());
    }

    @Test
    @DisplayName("Should update metadata for the owner")
    void shouldUpdateMetadataForOwner() {
        CourseOffering offering = new CourseOffering(
                OFFERING_ID, SUBJECT_ID, SEMESTER_ID, TEACHER_ID,
                "DBI-01", "CSDL", "hash", "HINT"
        );
        when(offeringRepository.findById(OFFERING_ID)).thenReturn(Optional.of(offering));
        when(offeringRepository.existsBySemesterIdAndCodeAndIdNot(SEMESTER_ID, "DBI-02", OFFERING_ID))
                .thenReturn(false);
        when(offeringRepository.save(offering)).thenReturn(offering);

        CourseOffering result = offeringService.updateCourseOffering(
                TEACHER_ID, OFFERING_ID, new UpdateCourseOfferingCommand("DBI-02", "CSDL mới")
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
                        TEACHER_ID, OFFERING_ID, new UpdateCourseOfferingCommand(" ", null)
                )
        );

        assertEquals("NO_FIELDS_TO_UPDATE", ex.getErrorCode());
        verifyNoInteractions(offeringRepository);
    }
}
