package com.studyflow.note.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.document.application.CourseMaterialLibraryService;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.note.domain.CourseMaterialPageNote;
import com.studyflow.note.domain.CourseMaterialPageNoteRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Synthetic owner-scope tests for per-slide notes; no user document or external service is used. */
class CourseMaterialPageNoteServiceTest {
    private final UUID studentId = UUID.randomUUID();
    private final UUID documentId = UUID.randomUUID();
    private final Instant now = Instant.parse("2026-10-29T00:00:00Z");
    private final CourseMaterialPageNoteRepository notes = mock(CourseMaterialPageNoteRepository.class);
    private final CourseMaterialLibraryService materials = mock(CourseMaterialLibraryService.class);
    private CourseMaterialPageNoteService service;

    /** Args: none. Output: isolated service with fixed clock. Errors: none. */
    @BeforeEach
    void setUp() {
        service = new CourseMaterialPageNoteService(notes, materials, Clock.fixed(now, ZoneOffset.UTC));
    }

    /** Args: none. Input: authorized page without a saved note. Output: empty owner-scoped response. */
    @Test
    void returnsEmptyResponseWhenStudentHasNoNote() {
        when(notes.findByStudentIdAndDocumentIdAndPageNumber(studentId, documentId, 2))
                .thenReturn(Optional.empty());

        var result = service.get(studentId, documentId, 2);

        assertThat(result.content()).isEmpty();
        assertThat(result.updatedAt()).isNull();
        verify(materials).authorizeTutor(studentId, documentId, 2);
    }

    /** Args: none. Input: authorized page and valid content. Output: persisted private note. */
    @Test
    void savesValidStudentNote() {
        when(notes.findByStudentIdAndDocumentIdAndPageNumber(studentId, documentId, 3))
                .thenReturn(Optional.empty());
        when(notes.save(org.mockito.ArgumentMatchers.any(CourseMaterialPageNote.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.save(studentId, documentId, 3, "Ghi chú tổng hợp");

        assertThat(result.content()).isEqualTo("Ghi chú tổng hợp");
        assertThat(result.updatedAt()).isEqualTo(now);
        verify(materials).authorizeTutor(studentId, documentId, 3);
    }

    /** Args: none. Input: content beyond the documented limit. Output: validation error and no persistence. */
    @Test
    void rejectsOversizedNote() {
        assertThatThrownBy(() -> service.save(studentId, documentId, 1, "x".repeat(5001)))
                .isInstanceOf(ValidationException.class)
                .extracting("code").isEqualTo("INVALID_NOTE_CONTENT");
    }
}
