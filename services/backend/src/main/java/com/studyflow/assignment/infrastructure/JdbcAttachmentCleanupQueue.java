package com.studyflow.assignment.infrastructure;

import com.studyflow.assignment.application.AttachmentCleanupQueue;
import com.studyflow.assignment.application.PendingAttachmentCleanup;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcAttachmentCleanupQueue implements AttachmentCleanupQueue {
    private final JdbcTemplate jdbc;

    /** Args: configured JDBC adapter. Input: app-schema connection. Output: queue adapter; errors: none. */
    public JdbcAttachmentCleanupQueue(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void enqueue(String storageKey, Instant now) {
        jdbc.update("""
                INSERT INTO app.assignment_attachment_cleanup_queue
                    (id, storage_key, attempt_count, next_attempt_at, created_at)
                VALUES (?, ?, 0, ?, ?) ON CONFLICT (storage_key) DO NOTHING
                """, UUID.randomUUID(), storageKey, Timestamp.from(now), Timestamp.from(now));
    }

    @Override
    public List<PendingAttachmentCleanup> lockDue(Instant now, int limit) {
        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException("Cleanup batch limit must be 1..100");
        }
        return jdbc.query("""
                SELECT id, storage_key, attempt_count
                FROM app.assignment_attachment_cleanup_queue
                WHERE next_attempt_at <= ?
                ORDER BY next_attempt_at, id
                LIMIT ? FOR UPDATE SKIP LOCKED
                """, (rs, rowNum) -> new PendingAttachmentCleanup(
                rs.getObject("id", UUID.class), rs.getString("storage_key"), rs.getInt("attempt_count")
        ), Timestamp.from(now), limit);
    }

    @Override
    public void markDeleted(UUID id) {
        jdbc.update("DELETE FROM app.assignment_attachment_cleanup_queue WHERE id = ?", id);
    }

    @Override
    public void scheduleRetry(UUID id, int attemptCount, Instant nextAttemptAt) {
        jdbc.update("""
                UPDATE app.assignment_attachment_cleanup_queue
                SET attempt_count = ?, next_attempt_at = ? WHERE id = ?
                """, attemptCount, Timestamp.from(nextAttemptAt), id);
    }
}
