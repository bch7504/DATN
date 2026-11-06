package com.studyflow.document.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.assignment.domain.CourseAssignmentRepository;
import com.studyflow.common.exception.ApiException;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.document.domain.TeacherResourceLibrary;
import com.studyflow.document.domain.TeacherResourceLibraryItem;
import com.studyflow.document.domain.TeacherResourceLibraryItemRepository;
import com.studyflow.document.domain.TeacherResourceLibraryRepository;
import com.studyflow.review.domain.QuizDraftStore;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TeacherResourceLibraryServiceTest {
    private static final UUID TEACHER_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID LIBRARY_ID = UUID.fromString("00000000-0000-0000-0000-000000000102");
    private static final UUID SUBJECT_ID = UUID.fromString("00000000-0000-0000-0000-000000000103");
    private static final UUID DOCUMENT_ID = UUID.fromString("00000000-0000-0000-0000-000000000104");
    private static final Instant NOW = Instant.parse("2026-11-05T08:00:00Z");

    @Mock TeacherResourceLibraryRepository libraries;
    @Mock TeacherResourceLibraryItemRepository items;
    @Mock SubjectRepository subjects;
    @Mock CourseMaterialDocumentRepository documents;
    @Mock QuizDraftStore quizzes;
    @Mock CourseAssignmentRepository assignments;
    private TeacherResourceLibraryService service;

    @BeforeEach
    void setUp() {
        service = new TeacherResourceLibraryService(libraries, items, subjects, documents, quizzes,
                assignments, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void createsSubjectLibraryAndReturnsTypedOutput() {
        Subject subject = new Subject(SUBJECT_ID, "KTS", "Kỹ thuật số", 3, null, "ACTIVE");
        when(subjects.findById(SUBJECT_ID)).thenReturn(Optional.of(subject));
        when(libraries.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(items.findByLibraryIdOrderByAddedAtDesc(any())).thenReturn(List.of());

        var result = service.create(TEACHER_ID, "Kho Kỹ thuật số", SUBJECT_ID);

        assertThat(result.name()).isEqualTo("Kho Kỹ thuật số");
        assertThat(result.libraryType()).isEqualTo("SUBJECT");
        assertThat(result.subjectCode()).isEqualTo("KTS");
        assertThat(result.items()).isEmpty();
    }

    @Test
    void rejectsBlankLibraryName() {
        assertThatThrownBy(() -> service.create(TEACHER_ID, "   ", null))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void createsAndReturnsNonDeletableDefaultLibrary() {
        when(libraries.findByTeacherIdAndLibraryTypeAndDeletedAtIsNull(TEACHER_ID, "DEFAULT"))
                .thenReturn(Optional.empty());
        when(libraries.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(libraries.findByTeacherIdAndDeletedAtIsNullOrderByCreatedAtDesc(TEACHER_ID))
                .thenAnswer(invocation -> List.of(TeacherResourceLibrary.defaultLibrary(
                        UUID.nameUUIDFromBytes(("studyflow-default-library:" + TEACHER_ID)
                                .getBytes(java.nio.charset.StandardCharsets.UTF_8)), TEACHER_ID, NOW)));
        when(items.findByLibraryIdOrderByAddedAtDesc(any())).thenReturn(List.of());

        var result = service.list(TEACHER_ID);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Tài liệu tải lên");
        assertThat(result.get(0).libraryType()).isEqualTo("DEFAULT");
    }

    @Test
    void rejectsDeletingDefaultLibrary() {
        TeacherResourceLibrary fallback = TeacherResourceLibrary.defaultLibrary(LIBRARY_ID, TEACHER_ID, NOW);
        when(libraries.findByIdAndTeacherIdAndDeletedAtIsNull(LIBRARY_ID, TEACHER_ID))
                .thenReturn(Optional.of(fallback));

        assertThatThrownBy(() -> service.delete(TEACHER_ID, LIBRARY_ID))
                .isInstanceOf(ApiException.class)
                .extracting("code").isEqualTo("DEFAULT_LIBRARY_REQUIRED");
    }

    @Test
    void filesUploadIntoDefaultLibraryWhenNoDestinationWasSelected() {
        TeacherResourceLibrary fallback = TeacherResourceLibrary.defaultLibrary(LIBRARY_ID, TEACHER_ID, NOW);
        when(libraries.findByTeacherIdAndLibraryTypeAndDeletedAtIsNull(TEACHER_ID, "DEFAULT"))
                .thenReturn(Optional.of(fallback));

        service.fileUploaded(TEACHER_ID, null, DOCUMENT_ID);

        verify(items).insertIgnore(any(), org.mockito.ArgumentMatchers.eq(LIBRARY_ID),
                org.mockito.ArgumentMatchers.eq("DOCUMENT"), org.mockito.ArgumentMatchers.eq(DOCUMENT_ID), any());
    }

    @Test
    void addsOwnedDocumentIdempotently() {
        TeacherResourceLibrary library = new TeacherResourceLibrary(LIBRARY_ID, TEACHER_ID, "Kho riêng", null, NOW);
        CourseMaterialDocument document = new CourseMaterialDocument(DOCUMENT_ID, TEACHER_ID, "slide.pdf",
                "Slide", "teacher/key", 100, 2, NOW);
        when(libraries.findByIdAndTeacherIdAndDeletedAtIsNull(LIBRARY_ID, TEACHER_ID)).thenReturn(Optional.of(library));
        when(documents.findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(DOCUMENT_ID, TEACHER_ID, "COURSE_MATERIAL"))
                .thenReturn(Optional.of(document));
        when(items.insertIgnore(any(), any(), any(), any(), any())).thenReturn(1);
        when(items.findByLibraryIdOrderByAddedAtDesc(LIBRARY_ID)).thenReturn(List.of());

        var result = service.addItem(TEACHER_ID, LIBRARY_ID, "document", DOCUMENT_ID);

        assertThat(result.id()).isEqualTo(LIBRARY_ID);
        verify(items).insertIgnore(any(), any(), any(), any(), any());
    }
}
