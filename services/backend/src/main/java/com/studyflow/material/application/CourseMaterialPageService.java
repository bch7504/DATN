package com.studyflow.material.application;

import com.studyflow.common.exception.ValidationException;
import com.studyflow.document.application.CourseMaterialLibraryService;
import com.studyflow.progress.application.LearningEventService;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns Student notes and verified page-view activity for published Course Material PDFs. */
@Service
public class CourseMaterialPageService {
    private final CourseMaterialLibraryService materials;
    private final LearningEventService learningEvents;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    /** Args: required authorized-material service, event service, app-schema JDBC client and clock.
     * Input: Spring managed dependencies. Output: initialized service. Errors: none. */
    public CourseMaterialPageService(CourseMaterialLibraryService materials, LearningEventService learningEvents,
                                     JdbcTemplate jdbc, Clock clock) {
        this.materials = materials;
        this.learningEvents = learningEvents;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /**
     * Args: authenticated Student, PDF and 1-based page.
     * Input: current APPROVED enrollment and publication; READY PDF within page bounds.
     * Output: saved note or empty content when no note exists. Errors: 403/404/409/422 from authorization.
     */
    @Transactional(readOnly = true)
    public PageNote readNote(UUID studentId, UUID documentId, int pageNumber) {
        materials.authorizePage(studentId, documentId, pageNumber);
        List<PageNote> notes = jdbc.query("""
                SELECT content, updated_at FROM app.page_notes
                WHERE student_id = ? AND document_id = ? AND page_number = ?
                """, (rs, row) -> new PageNote(documentId, pageNumber, rs.getString("content"),
                rs.getTimestamp("updated_at").toInstant()), studentId, documentId, pageNumber);
        return notes.isEmpty() ? new PageNote(documentId, pageNumber, "", null) : notes.get(0);
    }

    /**
     * Args: authenticated Student, PDF, 1-based page and required content of at most 10000 characters.
     * Input: current APPROVED enrollment and publication; READY PDF within page bounds.
     * Output: upserted note; side effect is owner-scoped note persistence.
     * Errors: 403/404/409/422 from authorization or INVALID_NOTE on malformed content.
     */
    @Transactional
    public PageNote saveNote(UUID studentId, UUID documentId, int pageNumber, String content) {
        materials.authorizePage(studentId, documentId, pageNumber);
        if (content == null || content.length() > 10_000) {
            throw new ValidationException("INVALID_NOTE", "Ghi chú phải có tối đa 10.000 ký tự.");
        }
        Instant now = clock.instant();
        return jdbc.queryForObject("""
                INSERT INTO app.page_notes (id, student_id, document_id, page_number, content, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (student_id, document_id, page_number)
                DO UPDATE SET content = EXCLUDED.content, updated_at = EXCLUDED.updated_at
                RETURNING content, updated_at
                """, (rs, row) -> new PageNote(documentId, pageNumber, rs.getString("content"),
                rs.getTimestamp("updated_at").toInstant()), UUID.randomUUID(), studentId, documentId,
                pageNumber, content, Timestamp.from(now), Timestamp.from(now));
    }

    /**
     * Args: authenticated Student, PDF, 1-based page and required Idempotency-Key (1..100 chars).
     * Input: current APPROVED enrollment and publication; READY PDF within page bounds.
     * Output: void; stores one lifetime viewed page and at most one VIEW_PAGE event per local day.
     * Errors: 403/404/409/422 from authorization or INVALID_IDEMPOTENCY_KEY.
     */
    @Transactional
    public void recordView(UUID studentId, UUID documentId, int pageNumber, String idempotencyKey) {
        materials.authorizePage(studentId, documentId, pageNumber);
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 100) {
            throw new ValidationException("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key phải có từ 1 đến 100 ký tự.");
        }
        Instant now = clock.instant();
        LocalDate day = now.atZone(learningEvents.resolveStudentZone(studentId)).toLocalDate();
        UUID pageId = UUID.nameUUIDFromBytes((documentId + ":" + pageNumber).getBytes(StandardCharsets.UTF_8));
        String scopedKey = UUID.nameUUIDFromBytes((documentId + ":" + pageNumber + ":" + day + ":" + idempotencyKey)
                .getBytes(StandardCharsets.UTF_8)).toString();
        jdbc.update("""
                INSERT INTO app.course_material_page_views
                    (student_id, document_id, page_number, first_viewed_at, last_viewed_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT DO NOTHING
                """, studentId, documentId, pageNumber, Timestamp.from(now), Timestamp.from(now));
        jdbc.update("""
                INSERT INTO app.learning_events
                    (id, student_id, event_type, source_type, source_id, quantity, idempotency_key,
                     occurred_at, activity_date, created_at)
                VALUES (?, ?, 'VIEW_PAGE', 'COURSE_MATERIAL_PAGE', ?, 1, ?, ?, ?, ?)
                ON CONFLICT DO NOTHING
                """, UUID.randomUUID(), studentId, pageId, scopedKey, Timestamp.from(now), day, Timestamp.from(now));
    }

    /** Output: owner-safe note content and update time; null updatedAt means no saved note. */
    public record PageNote(UUID documentId, int pageNumber, String content, Instant updatedAt) { }
}
