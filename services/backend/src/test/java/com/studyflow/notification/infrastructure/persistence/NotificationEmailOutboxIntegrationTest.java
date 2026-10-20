package com.studyflow.notification.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
class NotificationEmailOutboxIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-10-15T09:00:00Z");

    @Test
    void flywayMigrationQueuesAndLocksOneEmailWithoutDuplicates() {
        try (PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")) {
            postgres.start();
            DataSource source = new DriverManagerDataSource(
                    postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
            Flyway.configure().dataSource(source).defaultSchema("app").schemas("app")
                    .createSchemas(true).locations("classpath:db/migration").load().migrate();
            JdbcTemplate jdbc = new JdbcTemplate(source);
            JdbcNotificationEmailOutbox outbox = new JdbcNotificationEmailOutbox(jdbc);
            UUID studentId = UUID.randomUUID();
            UUID notificationId = UUID.randomUUID();
            UUID sourceId = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO app.users (id, email, username, password_hash, full_name, time_zone,
                                           role, status, email_verified_at, created_at, updated_at)
                    VALUES (?, 'test@stu.ptit.edu.vn', 'test', 'synthetic-hash', 'Sinh viên test',
                            'Asia/Ho_Chi_Minh', 'STUDENT', 'ACTIVE', ?, ?, ?)
                    """, studentId, Timestamp.from(NOW), Timestamp.from(NOW), Timestamp.from(NOW));
            jdbc.update("""
                    INSERT INTO app.notifications (id, user_id, notification_type, title, message,
                                                   source_type, source_id, due_at, created_at)
                    VALUES (?, ?, 'ASSIGNMENT_PUBLISHED', 'Bài tập mới', 'Nội dung kiểm thử',
                            'COURSE_ASSIGNMENT', ?, ?, ?)
                    """, notificationId, studentId, sourceId, Timestamp.from(NOW.plusSeconds(3600)),
                    Timestamp.from(NOW));

            outbox.enqueue(notificationId, NOW);
            outbox.enqueue(notificationId, NOW);
            TransactionTemplate transaction = new TransactionTemplate(new DataSourceTransactionManager(source));
            transaction.executeWithoutResult(status -> {
                var due = outbox.lockDue(NOW, 10);
                assertThat(due).hasSize(1);
                assertThat(due.get(0).email()).isEqualTo("test@stu.ptit.edu.vn");
                assertThat(due.get(0).title()).isEqualTo("Bài tập mới");
                outbox.markSent(notificationId, NOW);
            });

            var remaining = transaction.execute(status -> outbox.lockDue(NOW, 10));
            assertThat(remaining).isEmpty();
            assertThat(jdbc.queryForObject("""
                    SELECT status FROM app.notification_email_outbox WHERE notification_id = ?
                    """, String.class, notificationId)).isEqualTo("SENT");
        }
    }
}
