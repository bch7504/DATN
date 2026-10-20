package com.studyflow.assignment.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
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
class AttachmentCleanupQueueIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-10-15T00:00:00Z");

    /** Args: none. Input: isolated PostgreSQL and all forward migrations. Output: durable deduplicated cleanup; errors: failed migration/assertions. */
    @Test
    void migrationCreatesQueueAndAdapterRetriesWithoutDuplicatingObjects() {
        try (PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")) {
            postgres.start();
            DataSource source = new DriverManagerDataSource(
                    postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
            Flyway.configure().dataSource(source).defaultSchema("app").schemas("app")
                    .createSchemas(true).locations("classpath:db/migration").load().migrate();
            JdbcAttachmentCleanupQueue queue = new JdbcAttachmentCleanupQueue(new JdbcTemplate(source));
            TransactionTemplate transaction = new TransactionTemplate(new DataSourceTransactionManager(source));

            queue.enqueue("assignment-submissions/synthetic-old-file", NOW);
            queue.enqueue("assignment-submissions/synthetic-old-file", NOW);
            transaction.executeWithoutResult(status -> {
                var due = queue.lockDue(NOW, 10);
                assertThat(due).hasSize(1);
                assertThat(due.get(0).storageKey()).isEqualTo("assignment-submissions/synthetic-old-file");
                queue.scheduleRetry(due.get(0).id(), 1, NOW.plusSeconds(60));
            });
            var beforeRetry = transaction.execute(status -> queue.lockDue(NOW, 10));
            assertThat(beforeRetry).isEmpty();
            transaction.executeWithoutResult(status -> {
                var due = queue.lockDue(NOW.plusSeconds(60), 10);
                assertThat(due).hasSize(1);
                assertThat(due.get(0).attemptCount()).isEqualTo(1);
                queue.markDeleted(due.get(0).id());
            });
            var afterDelete = transaction.execute(status -> queue.lockDue(NOW.plusSeconds(60), 10));
            assertThat(afterDelete).isEmpty();
        }
    }
}
