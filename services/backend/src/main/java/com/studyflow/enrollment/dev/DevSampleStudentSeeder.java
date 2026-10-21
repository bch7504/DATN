package com.studyflow.enrollment.dev;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserStatus;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Opt-in fixture for showing students in existing course offerings on a local database.
 * Fixture accounts use undeliverable email addresses and unknown random passwords.
 */
@Component
@Profile("sample-data")
@ConditionalOnProperty(name = "studyflow.dev.sample-students.enabled", havingValue = "true")
public class DevSampleStudentSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevSampleStudentSeeder.class);
    private static final int STUDENTS_PER_OFFERING = 12;

    private final DataSource dataSource;
    private final CourseOfferingRepository offerings;
    private final CourseEnrollmentRepository enrollments;
    private final UserAccountStore users;
    private final PasswordEncoder passwordEncoder;

    /**
     * Creates the opt-in startup fixture runner with persistence and password-hashing ports.
     *
     * @param dataSource required database connection used to verify loopback PostgreSQL
     * @param offerings required source of all existing course offerings
     * @param enrollments required store for approved sample memberships
     * @param users required store for synthetic student accounts
     * @param passwordEncoder required encoder for an unknown random password
     * @throws NullPointerException if Spring supplies a missing required dependency
     */
    public DevSampleStudentSeeder(
            DataSource dataSource,
            CourseOfferingRepository offerings,
            CourseEnrollmentRepository enrollments,
            UserAccountStore users,
            PasswordEncoder passwordEncoder
    ) {
        this.dataSource = Objects.requireNonNull(dataSource);
        this.offerings = Objects.requireNonNull(offerings);
        this.enrollments = Objects.requireNonNull(enrollments);
        this.users = Objects.requireNonNull(users);
        this.passwordEncoder = Objects.requireNonNull(passwordEncoder);
    }

    /**
     * Adds twelve distinct, approved sample students to each offering in the selected local database.
     *
     * @param args Spring startup arguments; required by {@link ApplicationRunner}, not used
     * @return void; creates only missing fixture users and enrollments in one transaction
     * @throws IllegalStateException when the database is not loopback PostgreSQL or a fixture ID/email
     *                               belongs to a different account; startup must stop rather than
     *                               alter non-fixture data
     */
    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        requireLocalDatabase();
        int offeringCount = 0;
        int createdEnrollments = 0;
        String unusablePasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
        Instant now = Instant.now();

        for (CourseOffering offering : offerings.findAll()) {
            offeringCount++;
            for (int number = 1; number <= STUDENTS_PER_OFFERING; number++) {
                UUID studentId = sampleId(offering.getId(), number);
                String username = "sf-mau-" + offering.getId().toString().replace("-", "") + "-" + number;
                String email = username + "@example.invalid";
                UserAccount existing = users.findById(studentId).orElse(null);
                if (existing == null) {
                    if (users.existsByEmail(email)) {
                        throw new IllegalStateException("Sample student email is already assigned to another account.");
                    }
                    users.save(new UserAccount(
                            studentId, email, username, unusablePasswordHash,
                            "Sinh viên mẫu " + String.format("%02d", number),
                            "Asia/Ho_Chi_Minh", UserRole.STUDENT, UserStatus.ACTIVE, now, now, now));
                } else if (!email.equals(existing.email()) || existing.role() != UserRole.STUDENT) {
                    throw new IllegalStateException("Sample student ID belongs to another account.");
                }

                if (enrollments.findByCourseOfferingIdAndStudentId(offering.getId(), studentId).isEmpty()) {
                    CourseEnrollment enrollment = new CourseEnrollment(null, offering.getId(), studentId);
                    enrollment.approve(offering.getTeacherId());
                    enrollments.save(enrollment);
                    createdEnrollments++;
                }
            }
        }
        log.info("Dev sample students: checked {} offerings, created {} approved enrollments.",
                offeringCount, createdEnrollments);
    }

    /**
     * Checks the configured connection before any fixture write.
     *
     * @return void; does not change database records
     * @throws IllegalStateException if the database is not loopback PostgreSQL or cannot be inspected
     */
    private void requireLocalDatabase() {
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            boolean localPostgres = false;
            if (url != null && url.startsWith("jdbc:postgresql://")) {
                String host = URI.create(url.substring("jdbc:".length())).getHost();
                localPostgres = "localhost".equalsIgnoreCase(host)
                        || "127.0.0.1".equals(host) || "::1".equals(host);
            }
            if (!localPostgres) {
                throw new IllegalStateException("Sample students require a loopback PostgreSQL database.");
            }
        } catch (SQLException | IllegalArgumentException exception) {
            throw new IllegalStateException("Cannot verify the local database before seeding.", exception);
        }
    }

    /**
     * Derives a stable fixture identity from a required offering ID and a number from 1 to 12.
     *
     * @param offeringId ID of the existing course offering
     * @param number one-based fixture position in that offering
     * @return deterministic UUID; no side effects
     * @throws NullPointerException if offeringId is null
     * @throws IllegalArgumentException if number is outside 1 through 12
     */
    private UUID sampleId(UUID offeringId, int number) {
        Objects.requireNonNull(offeringId);
        if (number < 1 || number > STUDENTS_PER_OFFERING) {
            throw new IllegalArgumentException("Sample student number is outside the fixture range.");
        }
        return UUID.nameUUIDFromBytes(("studyflow:dev:sample-student:" + offeringId + ":" + number)
                .getBytes(StandardCharsets.UTF_8));
    }
}
