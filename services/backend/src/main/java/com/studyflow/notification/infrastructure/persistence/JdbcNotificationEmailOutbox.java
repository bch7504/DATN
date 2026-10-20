package com.studyflow.notification.infrastructure.persistence;

import com.studyflow.notification.application.port.NotificationEmailOutbox;
import com.studyflow.notification.application.port.PendingNotificationEmail;
import com.studyflow.notification.domain.NotificationType;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcNotificationEmailOutbox implements NotificationEmailOutbox {
    private final JdbcTemplate jdbc;

    /** Args: required JDBC adapter; input: app schema connection; output: new store; errors: none. */
    public JdbcNotificationEmailOutbox(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void enqueue(UUID notificationId, Instant nextAttemptAt) {
        jdbc.update("""
                INSERT INTO app.notification_email_outbox (notification_id, status, attempt_count, next_attempt_at)
                VALUES (?, 'PENDING', 0, ?) ON CONFLICT DO NOTHING
                """, notificationId, Timestamp.from(nextAttemptAt));
    }

    @Override
    public List<PendingNotificationEmail> lockDue(Instant now, int limit) {
        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException("Email batch limit must be 1..100");
        }
        return jdbc.query("""
                SELECT e.notification_id, u.email, u.time_zone, u.role, u.status AS account_status,
                       n.notification_type, n.title, n.message, n.due_at, e.attempt_count
                FROM app.notification_email_outbox e
                JOIN app.notifications n ON n.id = e.notification_id
                JOIN app.users u ON u.id = n.user_id
                WHERE e.status = 'PENDING' AND e.next_attempt_at <= ?
                ORDER BY e.next_attempt_at, e.notification_id
                LIMIT ? FOR UPDATE OF e SKIP LOCKED
                """, (rs, rowNum) -> new PendingNotificationEmail(
                rs.getObject("notification_id", UUID.class), rs.getString("email"),
                rs.getString("time_zone"), rs.getString("role"), rs.getString("account_status"),
                NotificationType.valueOf(rs.getString("notification_type")), rs.getString("title"),
                rs.getString("message"), rs.getTimestamp("due_at") == null
                        ? null : rs.getTimestamp("due_at").toInstant(), rs.getInt("attempt_count")
        ), Timestamp.from(now), limit);
    }

    @Override
    public void markSent(UUID notificationId, Instant deliveredAt) {
        jdbc.update("""
                UPDATE app.notification_email_outbox
                SET status = 'SENT', delivered_at = ?, attempt_count = attempt_count + 1
                WHERE notification_id = ? AND status = 'PENDING'
                """, Timestamp.from(deliveredAt), notificationId);
    }

    @Override
    public void markSkipped(UUID notificationId) {
        jdbc.update("""
                UPDATE app.notification_email_outbox SET status = 'SKIPPED'
                WHERE notification_id = ? AND status = 'PENDING'
                """, notificationId);
    }

    @Override
    public void markAttemptFailed(UUID notificationId, int attemptCount, Instant retryAt, boolean terminal) {
        jdbc.update("""
                UPDATE app.notification_email_outbox
                SET status = ?, attempt_count = ?, next_attempt_at = ?
                WHERE notification_id = ? AND status = 'PENDING'
                """, terminal ? "FAILED" : "PENDING", attemptCount,
                Timestamp.from(retryAt), notificationId);
    }
}
