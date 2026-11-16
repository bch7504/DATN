package com.studyflow.auth.infrastructure;

import static org.assertj.core.api.Assertions.*;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/** Synthetic isolated PostgreSQL fixture only; never connects to local/shared user data. */
@Testcontainers(disabledWithoutDocker = true)
class AccountUsernameMigrationIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>(
            DockerImageName.parse("pgvector/pgvector:pg17").asCompatibleSubstituteFor("postgres"));
    private JdbcTemplate jdbc;

    /** Args: none. Output: isolated schema at V32; errors: container/migration failures.
     * Side effect: resets only this test container's app schema. */
    @BeforeEach void beforeMigration() {
        var source=new DriverManagerDataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword());
        jdbc=new JdbcTemplate(source);
        var baseline=Flyway.configure().dataSource(source).defaultSchema("app").schemas("app")
                .cleanDisabled(false).target("32").load();
        baseline.clean();
        baseline.migrate();
    }

    /** Args: role, email and old username. Returns: synthetic user UUID; errors: invalid fixture SQL. */
    private UUID account(String role,String email,String username) {
        UUID id=UUID.randomUUID();
        jdbc.update("""
            INSERT INTO app.users(id,email,username,password_hash,full_name,role,status,email_verified_at,created_at,updated_at)
            VALUES(?,?,?,'synthetic-hash','Synthetic account',?,'ACTIVE',NOW(),NOW(),NOW())
            """,id,email,username,role);
        return id;
    }

    /** Args: none. Returns: fixture Flyway without target limit; errors: configuration failure. */
    private Flyway latest() {
        return Flyway.configure().dataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword())
                .defaultSchema("app").schemas("app").load();
    }

    /** Args: none. Output: void; checks identities/resources remain and repeat migration is a no-op. */
    @Test void preservesIdentitiesAndPasswordsWhileRenamingBothRoles() {
        UUID student=account("STUDENT","student.a@stu.ptit.edu.vn","student.a");
        UUID teacher=account("TEACHER","teacher.a@ptit.edu.vn","teacher.a");
        UUID admin=account("ADMIN","admin@example.test","admin.local");
        jdbc.update("INSERT INTO app.refresh_tokens(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,'synthetic-token',NOW()+INTERVAL '1 hour',NOW())",UUID.randomUUID(),student);
        latest().migrate();
        assertThat(jdbc.queryForObject("SELECT username FROM app.users WHERE id=?",String.class,student)).isEqualTo("student.a@stu.ptit.edu.vn");
        assertThat(jdbc.queryForObject("SELECT username FROM app.users WHERE id=?",String.class,teacher)).isEqualTo("teacher.a@ptit.edu.vn");
        assertThat(jdbc.queryForObject("SELECT username FROM app.users WHERE id=?",String.class,admin)).isEqualTo("admin.local");
        assertThat(jdbc.queryForObject("SELECT password_hash FROM app.users WHERE id=?",String.class,student)).isEqualTo("synthetic-hash");
        assertThat(jdbc.queryForObject("SELECT revoked_at IS NOT NULL FROM app.refresh_tokens WHERE user_id=?",Boolean.class,student)).isTrue();
        assertThat(jdbc.queryForObject("SELECT character_maximum_length FROM information_schema.columns WHERE table_schema='app' AND table_name='users' AND column_name='username'",Integer.class)).isEqualTo(254);
        assertThat(latest().migrate().migrationsExecuted).isZero();
    }

    /** Args: none. Output: void; a cross-account login collision rolls back instead of merging users. */
    @Test void refusesConflictingLoginWithoutPartialRename() {
        UUID student=account("STUDENT","student.a@stu.ptit.edu.vn","student.a");
        account("ADMIN","other@example.test","student.a@stu.ptit.edu.vn");
        assertThatThrownBy(()->latest().migrate()).isInstanceOf(FlywayException.class);
        assertThat(jdbc.queryForObject("SELECT username FROM app.users WHERE id=?",String.class,student)).isEqualTo("student.a");
        assertThat(jdbc.queryForObject("SELECT character_maximum_length FROM information_schema.columns WHERE table_schema='app' AND table_name='users' AND column_name='username'",Integer.class)).isEqualTo(100);
    }
}
