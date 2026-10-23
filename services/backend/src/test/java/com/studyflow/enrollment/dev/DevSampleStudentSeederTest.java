package com.studyflow.enrollment.dev;

import static org.assertj.core.api.Assertions.assertThat;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.user.domain.UserRole;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
        "spring.profiles.active=sample-data",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.mail.host=127.0.0.1",
        "spring.mail.username=test",
        "spring.mail.password=test-only",
        "studyflow.auth.mail-from=test@example.invalid",
        "studyflow.auth.jwt-secret=sample-data-test-signing-key-minimum-32-bytes",
        "studyflow.dev.sample-students.enabled=true",
        "logging.level.root=ERROR", "spring.main.banner-mode=off",
        "spring.jpa.show-sql=false", "logging.level.org.hibernate.SQL=OFF"
})
class DevSampleStudentSeederTest {
    @Container
    private static final PostgreSQLContainer<?> DATABASE = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("studyflow_sample_test")
            .withInitScript("postgres-schema.sql");

    /**
     * Starts an isolated PostgreSQL test database, never the application's configured database.
     *
     * @param registry required Spring registry; receives container URL, username and password
     * @return void; starts the container if needed and registers test connection properties
     * @throws IllegalStateException if the PostgreSQL container cannot start
     */
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        DATABASE.start();
        registry.add("spring.datasource.url", () -> {
            String jdbcUrl = DATABASE.getJdbcUrl();
            return jdbcUrl + (jdbcUrl.contains("?") ? "&" : "?") + "currentSchema=app";
        });
        registry.add("spring.datasource.username", DATABASE::getUsername);
        registry.add("spring.datasource.password", DATABASE::getPassword);
    }

    @Autowired private DevSampleStudentSeeder seeder;
    @Autowired private CourseOfferingRepository offerings;
    @Autowired private CourseEnrollmentRepository enrollments;
    @Autowired private UserAccountStore users;

    /** No args; verifies valid two-class input yields exactly twelve approved, typed student rows per class. */
    @Test
    void seedsTwelveDistinctApprovedStudentsPerOfferingAndDoesNotDuplicate() {
        UUID teacher = UUID.randomUUID();
        CourseOffering first = offerings.save(new CourseOffering(null, UUID.randomUUID(), UUID.randomUUID(),
                teacher, "SAMPLE-1", "Sample class 1", null, null));
        CourseOffering second = offerings.save(new CourseOffering(null, UUID.randomUUID(), UUID.randomUUID(),
                teacher, "SAMPLE-2", "Sample class 2", null, null));

        seeder.run(new DefaultApplicationArguments(new String[0]));
        seeder.run(new DefaultApplicationArguments(new String[0]));

        assertThat(enrollments.countByCourseOfferingIdAndStatus(first.getId(), EnrollmentStatus.APPROVED))
                .isEqualTo(12);
        assertThat(enrollments.countByCourseOfferingIdAndStatus(second.getId(), EnrollmentStatus.APPROVED))
                .isEqualTo(12);
        assertThat(enrollments.count()).isEqualTo(24);
        assertThat(enrollments.findByCourseOfferingId(first.getId())).allSatisfy(enrollment -> {
            var student = users.findById(enrollment.getStudentId()).orElseThrow();
            assertThat(student.role()).isEqualTo(UserRole.STUDENT);
            assertThat(student.email()).endsWith("@example.invalid");
            assertThat(student.fullName()).startsWith("Sinh viên mẫu ");
        });
        assertThat(enrollments.findByCourseOfferingId(first.getId()))
                .extracting(enrollment -> enrollment.getStudentId()).doesNotHaveDuplicates();
    }

}
