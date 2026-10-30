package com.studyflow.material.application;

import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.document.application.CourseMaterialLibraryService;
import com.studyflow.progress.application.LearningEventService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Synthetic guard cases: unauthorized PDF access must not write notes or progress. */
class CourseMaterialPageServiceTest {
    private static final UUID STUDENT = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID DOCUMENT = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private CourseMaterialLibraryService materials;
    private JdbcTemplate jdbc;
    private CourseMaterialPageService service;

    /** Args: none. Input: synthetic identifiers and mocked adapters. Output: test service. Errors: setup failure. */
    @BeforeEach
    void setUp() {
        materials = mock(CourseMaterialLibraryService.class);
        jdbc = mock(JdbcTemplate.class);
        service = new CourseMaterialPageService(materials, mock(LearningEventService.class), jdbc,
                Clock.fixed(Instant.parse("2026-10-20T01:00:00Z"), ZoneOffset.UTC));
    }

    /** Args: none. Input: revoked publication. Output: forbidden and no database writes. Errors: assertion failure. */
    @Test
    void revokedPublicationCannotCreatePageView() {
        when(materials.authorizePage(STUDENT, DOCUMENT, 3))
                .thenThrow(new ForbiddenException("ENROLLMENT_REQUIRED", "Không có quyền xem học liệu."));
        assertThatThrownBy(() -> service.recordView(STUDENT, DOCUMENT, 3, "test-key"))
                .isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(jdbc);
    }

    /** Args: none. Input: missing note content. Output: validation error and no database write. Errors: assertion failure. */
    @Test
    void nullNoteContentIsRejectedBeforePersistence() {
        assertThatThrownBy(() -> service.saveNote(STUDENT, DOCUMENT, 3, null))
                .isInstanceOf(ValidationException.class);
        verifyNoInteractions(jdbc);
    }

    /** Args: none. Input: oversized key. Output: validation error and no page/progress write. Errors: assertion failure. */
    @Test
    void oversizedViewKeyIsRejectedBeforePersistence() {
        assertThatThrownBy(() -> service.recordView(STUDENT, DOCUMENT, 3, "x".repeat(101)))
                .isInstanceOf(ValidationException.class);
        verifyNoInteractions(jdbc);
    }
}
