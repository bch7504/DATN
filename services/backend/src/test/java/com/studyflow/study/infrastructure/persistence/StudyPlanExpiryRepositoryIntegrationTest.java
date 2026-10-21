package com.studyflow.study.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Validates the real PostgreSQL expiry-candidate query and V13 notification constraint. */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.properties.hibernate.default_schema=app",
        "spring.flyway.enabled=true",
        "spring.flyway.create-schemas=true",
        "spring.flyway.default-schema=app",
        "spring.flyway.schemas=app"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class StudyPlanExpiryRepositoryIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-10-21T08:00:00Z");

    @Container
    private static final PostgreSQLContainer<?> DATABASE = new PostgreSQLContainer<>("postgres:16-alpine");

    /** Args: Spring registry. Input: isolated PostgreSQL container. Output: test datasource properties; errors: container startup. */
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> DATABASE.getJdbcUrl() + "?currentSchema=app");
        registry.add("spring.datasource.username", DATABASE::getUsername);
        registry.add("spring.datasource.password", DATABASE::getPassword);
    }

    @Autowired private JdbcTemplate jdbc;
    @Autowired private SpringDataStudyPlanItemRepository items;

    /** Args: none. Input: synthetic completed/on-time and overdue records. Output: candidate only until one expiry notice exists. */
    @Test
    void findsExpiredItemsOnceAndAcceptsTheNewNotificationType() {
        UUID studentId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Instant dueAt = NOW.minusSeconds(60);
        jdbc.update("""
                INSERT INTO app.users (id, email, username, password_hash, full_name, time_zone,
                                       role, status, email_verified_at, created_at, updated_at)
                VALUES (?, ?, ?, 'synthetic-hash', 'Sinh viên test', 'Asia/Ho_Chi_Minh',
                        'STUDENT', 'ACTIVE', ?, ?, ?)
                """, studentId, "expiry-" + studentId + "@stu.ptit.edu.vn", "expiry-" + studentId,
                Timestamp.from(NOW), Timestamp.from(NOW), Timestamp.from(NOW));
        jdbc.update("""
                INSERT INTO app.study_plans (id, student_id, title, start_date, end_date,
                                             status, created_at, updated_at)
                VALUES (?, ?, 'Kế hoạch test', ?, ?, 'ACTIVE', ?, ?)
                """, planId, studentId, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                Timestamp.from(NOW), Timestamp.from(NOW));
        jdbc.update("""
                INSERT INTO app.study_plan_items (id, plan_id, title, item_type, due_at, status,
                                                  created_at, updated_at)
                VALUES (?, ?, 'Ôn tập', 'TASK', ?, 'TODO', ?, ?)
                """, itemId, planId, Timestamp.from(dueAt), Timestamp.from(NOW), Timestamp.from(NOW));

        var pending = items.findExpiredCandidates(NOW, PageRequest.of(0, 20));
        assertThat(pending).hasSize(1);
        assertThat(pending.get(0).getItemId()).isEqualTo(itemId);
        assertThat(pending.get(0).getStudentId()).isEqualTo(studentId);
        assertThat(pending.get(0).getCompletedAt()).isNull();

        jdbc.update("""
                INSERT INTO app.notifications (id, user_id, notification_type, title, message,
                                               source_type, source_id, due_at, created_at)
                VALUES (?, ?, 'STUDY_PLAN_ITEM_EXPIRED', 'Hết hạn', 'Chưa hoàn thành',
                        'STUDY_PLAN_ITEM', ?, ?, ?)
                """, UUID.randomUUID(), studentId, itemId, Timestamp.from(dueAt), Timestamp.from(NOW));
        assertThat(items.findExpiredCandidates(NOW, PageRequest.of(0, 20))).isEmpty();
    }
}
