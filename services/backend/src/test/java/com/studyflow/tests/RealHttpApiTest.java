package com.studyflow.tests;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.academic.domain.*;
import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.auth.application.port.VerificationCodeSender;
import com.studyflow.assignment.application.AssignmentAttachmentCleanupJob;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.user.domain.*;
import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Real socket HTTP audit: real controllers/security/services/JPA, isolated PostgreSQL database.
 * Only outbound email and object storage are test doubles. No production accounts, files or SMTP.
 * Run: mvnw.cmd -Dtest=RealHttpApiTest test. Nonzero exit means a contract/scenario failed.
 * Tests have no args and return void; HTTP/JSON errors and failed expectations fail the test.
 * Console output contains method/path/status only, never cookies, passwords, OTPs or file contents.
 * This does not validate Flyway migrations, S3 connectivity, SMTP delivery or browser UI.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.profiles.active=qa-http",
        "server.address=127.0.0.1",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false",
        "spring.flyway.enabled=false", "spring.sql.init.mode=never",
        "spring.mail.host=127.0.0.1", "spring.mail.port=1",
        "spring.mail.username=qa", "spring.mail.password=qa-not-real",
        "management.health.mail.enabled=false", "studyflow.storage.enabled=false",
        "studyflow.auth.jwt-secret=qa-only-signing-key-never-use-outside-tests-123456789",
        "studyflow.auth.mail-from=qa@example.invalid", "studyflow.auth.cookie-secure=false",
        "studyflow.auth.allowed-email-domain=stu.ptit.edu.vn", "studyflow.auth.resend-cooldown=60s",
        "studyflow.cors.allowed-origins=http://localhost:3000",
        "studyflow.notifications.reminder-scan-delay=3600000",
        "studyflow.notifications.email-scan-delay=3600000",
        "studyflow.assignments.attachment-cleanup-delay=3600000",
        "logging.level.root=ERROR", "spring.main.banner-mode=off"
})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@org.springframework.context.annotation.Import(RealHttpApiTest.Diagnostics.class)
class RealHttpApiTest {
    @Container
    private static final PostgreSQLContainer<?> DATABASE = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("studyflow_qa")
            .withInitScript("postgres-schema.sql");

    /**
     * Starts the isolated PostgreSQL container before Spring resolves the test connection.
     *
     * @param registry required Spring registry; receives URL, username and password
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

    private static final String PASSWORD = "Qa12345678!";
    private static final String MISSING_ID = "00000000-0000-0000-0000-000000000001";
    @LocalServerPort private int port;
    @Autowired private UserAccountStore users;
    @Autowired private PasswordEncoder passwords;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired private SubjectRepository subjects;
    @Autowired private SemesterRepository semesters;
    @Autowired private com.studyflow.notification.application.port.NotificationStore notifications;
    @Autowired private org.springframework.transaction.PlatformTransactionManager transactions;
    @Autowired private AssignmentAttachmentCleanupJob attachmentCleanupJob;
    @Autowired private CourseMaterialDocumentRepository documents;
    @Autowired private javax.sql.DataSource dataSource;
    @Autowired private ObjectMapper json;
    @Autowired @Qualifier("requestMappingHandlerMapping") private RequestMappingHandlerMapping mappings;
    @MockBean(reset = org.springframework.boot.test.mock.mockito.MockReset.NONE) private VerificationCodeSender mail;
    @MockBean(reset = org.springframework.boot.test.mock.mockito.MockReset.NONE) private AssignmentAttachmentStorage storage;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final Map<String, String> codes = new ConcurrentHashMap<>();
    private final Map<String, byte[]> objects = new ConcurrentHashMap<>();
    private final Set<String> called = new TreeSet<>();
    private String teacher, student, admin, otherTeacher, otherStudent;
    private UUID studentId, subjectId, semesterId;

    /** No args. Input: isolated synthetic accounts, PDF and approved class passed to Node through stdin.
     * Output: void; runs the actual frontend API client against this Java HTTP server.
     * Opt-in: -Dstudyflow.web.contract=true; requires Node and installed frontend test dependencies.
     * Errors: child timeout/nonzero exit fails test; cookies stay in memory and are never printed.
     */
    @Test
    @org.junit.jupiter.api.condition.EnabledIfSystemProperty(named = "studyflow.web.contract", matches = "true")
    void actualFrontendClientAgainstJavaHttp() throws Exception {
        String offeringId = approvedCourse();
        Process process = new ProcessBuilder("node", "tests/java-integration.cjs")
                .directory(Path.of("../../apps/web").toFile()).redirectErrorStream(true).start();
        try {
            try (OutputStream input = process.getOutputStream()) {
                json.writeValue(input, Map.of("baseUrl", "http://127.0.0.1:" + port + "/api/v1",
                        "teacher", teacher, "student", student, "studentId", studentId,
                        "offeringId", offeringId, "pdfBase64", Base64.getEncoder().encodeToString(syntheticPdf())));
            }
            assertThat(process.waitFor(60, java.util.concurrent.TimeUnit.SECONDS)).as("Frontend client timeout").isTrue();
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            output.lines().filter(line -> line.startsWith("WEB_JAVA_")).forEach(System.out::println);
            assertThat(process.exitValue()).as("Actual frontend client integration (see WEB_JAVA status)").isZero();
            assertThat(output.lines().filter(line -> line.startsWith("WEB_JAVA_PASS")).count()).isEqualTo(3);
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    /** No args; seeds isolated accounts/catalog and external adapter doubles. Output void; errors abort setup. */
    @BeforeAll
    void prepareIsolatedFixtures() throws Exception {
        new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
                new org.springframework.core.io.ClassPathResource(
                        "db/migration/V15__create_personal_assistant_and_ai_quiz_tables.sql"))
                .execute(dataSource);
        doAnswer(call -> { codes.put(call.getArgument(0), call.getArgument(2)); return null; })
                .when(mail).send(any(), any(), any(), any());
        doAnswer(call -> {
            InputStream input = call.getArgument(2);
            objects.put(call.getArgument(0), input.readAllBytes());
            return null;
        }).when(storage).put(any(), any(), any(), org.mockito.ArgumentMatchers.anyLong());
        when(storage.get(any())).thenAnswer(call -> new ByteArrayInputStream(
                Objects.requireNonNull(objects.get(call.getArgument(0)), "Missing synthetic object")));
        doAnswer(call -> { objects.remove(call.getArgument(0)); return null; }).when(storage).delete(any());
        teacher = seedAndLogin("qa-teacher", UserRole.TEACHER);
        student = seedAndLogin("qa-student", UserRole.STUDENT);
        admin = seedAndLogin("qa-admin", UserRole.ADMIN);
        otherTeacher = seedAndLogin("qa-teacher-other", UserRole.TEACHER);
        otherStudent = seedAndLogin("qa-student-other", UserRole.STUDENT);
        studentId = users.findByIdentifier("qa-student").orElseThrow().id();
        subjectId = subjects.save(new Subject(UUID.randomUUID(), "QA-HTTP", "Synthetic subject", 3, "QA only", "ACTIVE")).getId();
        semesterId = semesters.save(new Semester(UUID.randomUUID(), "QA-HTTP", "Synthetic semester", "QA",
                LocalDate.now().minusDays(10), LocalDate.now().plusDays(120), SemesterStatus.ACTIVE, true)).getId();
    }

    @Test
    void healthAndAuthenticationOverRealHttp() throws Exception {
        expect(send("GET", "/actuator/health", null, null), 200);
        expect(send("GET", "/api/v1/me", null, null), 401);
        JsonNode me = expect(send("GET", "/api/v1/me", student, null), 200);
        assertThat(me.path("role").asText()).isEqualTo("STUDENT");
        assertThat(me.has("passwordHash")).isFalse();
        expect(send("GET", "/api/v1/teacher/documents", student, null), 403);
        expect(send("GET", "/api/v1/student/materials", teacher, null), 403);
        expect(send("GET", "/api/v1/study-plans", teacher, null), 403);
        expect(send("POST", "/api/v1/auth/login", null,
                Map.of("identifier", "qa-student", "password", "invalid-password")), 401);
        expect(send("PATCH", "/api/v1/me", student, Map.of("displayName", "QA Updated", "timeZone", "Asia/Ho_Chi_Minh")), 200);
        expect(send("PATCH", "/api/v1/me", student, Map.of("role", "ADMIN")), 422);
    }

    @Test
    void registrationOtpAndRefreshLifecycleOverHttp() throws Exception {
        String email = "qa-registration@stu.ptit.edu.vn";
        expect(send("POST", "/api/v1/auth/register", null,
                Map.of("displayName", "QA Registration", "email", "qa@example.invalid", "password", PASSWORD)), 422);
        expect(send("POST", "/api/v1/auth/register", null,
                Map.of("displayName", "QA Registration", "email", "qa-registration@ptit.edu.vn", "password", PASSWORD)), 422);
        expect(send("POST", "/api/v1/auth/register", null,
                Map.of("displayName", "QA Registration", "email", "qa-registration@mail.stu.ptit.edu.vn", "password", PASSWORD)), 422);
        expect(send("POST", "/api/v1/auth/register", null,
                Map.of("displayName", "QA Registration", "email", email, "password", PASSWORD)), 202);
        expect(send("POST", "/api/v1/auth/resend-verification", null, Map.of("email", email)), 429);
        assertThat(codes.containsKey(email)).isTrue();
        expect(send("POST", "/api/v1/auth/verify-registration", null,
                Map.of("email", email, "verificationCode", codes.get(email))), 204);
        var login = send("POST", "/api/v1/auth/login", null, Map.of("identifier", email, "password", PASSWORD));
        expect(login, 204);
        String session = cookies(login);
        expect(send("GET", "/api/v1/me", session, null), 200);
        var refresh = send("POST", "/api/v1/auth/refresh", session, null);
        expect(refresh, 204);
        expect(send("POST", "/api/v1/auth/refresh", session, null), 401);
        String rotated = cookies(refresh);
        expect(send("POST", "/api/v1/auth/logout", rotated, null), 204);
        expect(send("POST", "/api/v1/auth/refresh", rotated, null), 401);
    }

    @Test
    void catalogCourseAndEnrollmentHappyPath() throws Exception {
        expect(send("GET", "/api/v1/catalog/subjects?status=ACTIVE", teacher, null), 200);
        expect(send("GET", "/api/v1/catalog/semesters?status=ACTIVE", teacher, null), 200);
        String offering = approvedCourse();
        expect(send("GET", "/api/v1/teacher/course-offerings", teacher, null), 200);
        expect(send("GET", "/api/v1/teacher/course-offerings/" + offering, teacher, null), 200);
        expect(send("PATCH", "/api/v1/teacher/course-offerings/" + offering, teacher,
                Map.of("code", "QA-" + UUID.randomUUID().toString().substring(0, 8), "name", "Updated synthetic course")), 200);
        expect(send("GET", "/api/v1/student/course-enrollments", student, null), 200);
        expect(send("GET", "/api/v1/student/course-offerings", student, null), 200);
        expect(send("GET", "/api/v1/student/course-offerings/" + offering, student, null), 200);
        expect(send("GET", "/api/v1/teacher/course-offerings/" + offering + "/enrollments", teacher, null), 200);
        expect(send("POST", "/api/v1/teacher/course-offerings/" + offering + "/join-code/regenerate", teacher, null), 200);
        expect(send("POST", "/api/v1/teacher/course-offerings/" + offering + "/archive", teacher, null), 200);
    }

    @Test
    void assignmentTextSubmissionStatisticsAndNotification() throws Exception {
        String offering = approvedCourse();
        Map<String, String> draft = Map.of("title", "QA assignment", "description", "Synthetic task",
                "dueAt", Instant.now().plusSeconds(86400 * 3).toString());
        String id = expect(send("POST", "/api/v1/teacher/course-offerings/" + offering + "/assignments", teacher, draft), 201).path("id").asText();
        expect(send("PUT", "/api/v1/teacher/assignments/" + id, teacher, draft), 200);
        expect(send("GET", "/api/v1/teacher/course-offerings/" + offering + "/assignments", teacher, null), 200);
        expect(send("POST", "/api/v1/teacher/assignments/" + id + "/publish", teacher, null), 200);
        assertThat(expect(send("GET", "/api/v1/teacher/notifications?size=100", teacher, null), 200)
                .path("items").findValuesAsText("type")).contains("TEACHER_ASSIGNMENT_PUBLISHED");
        expect(send("GET", "/api/v1/student/assignments", student, null), 200);
        JsonNode before = expect(send("GET", "/api/v1/teacher/assignments/" + id + "/submissions", teacher, null), 200);
        assertThat(before.path("notSubmittedCount").asInt()).isEqualTo(1);
        expect(send("POST", "/api/v1/student/assignments/" + id + "/submissions", student, Map.of("answerText", "Synthetic answer")), 200);
        JsonNode after = expect(send("GET", "/api/v1/teacher/assignments/" + id + "/submissions", teacher, null), 200);
        assertThat(after.path("submittedCount").asInt()).isEqualTo(1);
        assertThat(after.path("onTimeCount").asInt()).isEqualTo(1);
        assertThat(after.path("lateCount").asInt()).isZero();
        assertThat(after.path("students").get(0).has("score")).isFalse();
        expect(send("POST", "/api/v1/teacher/assignments/" + id + "/submissions/" + studentId + "/review", teacher,
                Map.of("score", 80)), 404);
        JsonNode notices = expect(send("GET", "/api/v1/student/notifications", student, null), 200);
        assertThat(notices.path("items").size()).isPositive();
        assertThat(notices.path("items").findValuesAsText("type"))
                .contains("ASSIGNMENT_PUBLISHED", "STUDENT_ASSIGNMENT_SUBMITTED");
        String notification = notices.path("items").get(0).path("id").asText();
        expect(send("PATCH", "/api/v1/student/notifications/" + notification + "/read", student, null), 200);
        expect(send("GET", "/api/v1/student/notifications?unreadOnly=true", student, null), 200);
    }

    @Test
    void assignmentFileUploadAndDownloadThroughHttp() throws Exception {
        String id = assignmentPublishedBeforeEnrollment();
        byte[] pdf = syntheticPdf();
        Set<String> keysBefore = new HashSet<>(objects.keySet());
        JsonNode result = expect(multipart("/api/v1/student/assignments/" + id + "/submissions/attachments", student, "files", pdf, null), 200);
        String attachment = result.path("attachments").get(0).path("id").asText();
        Set<String> firstUploadKeys = new HashSet<>(objects.keySet());
        firstUploadKeys.removeAll(keysBefore);
        assertThat(firstUploadKeys).hasSize(1);
        String oldKey = firstUploadKeys.iterator().next();
        var downloaded = send("GET", "/api/v1/student/assignments/" + id + "/submissions/attachments/" + attachment + "/download", student, null);
        assertThat(downloaded.statusCode()).isEqualTo(200);
        assertThat(downloaded.body()).isEqualTo(pdf);
        var teacherDownload = send("GET", "/api/v1/teacher/assignments/" + id + "/submissions/" + studentId + "/attachments/" + attachment + "/download", teacher, null);
        assertThat(teacherDownload.statusCode()).isEqualTo(200);
        assertThat(teacherDownload.body()).isEqualTo(pdf);
        JsonNode replacement = expect(multipart("/api/v1/student/assignments/" + id + "/submissions/attachments", student, "files", pdf, null), 200);
        assertThat(replacement.path("id").asText()).isEqualTo(result.path("id").asText());
        assertThat(replacement.has("score")).isFalse();
        assertThat(replacement.has("teacherFeedback")).isFalse();
        assertThat(replacement.path("attachments").size()).isEqualTo(1);
        String replacementId = replacement.path("attachments").get(0).path("id").asText();
        assertThat(replacementId).isNotEqualTo(attachment);
        expect(send("GET", "/api/v1/student/assignments/" + id + "/submissions/attachments/" + attachment + "/download", student, null), 404);
        expect(send("GET", "/api/v1/teacher/assignments/" + id + "/submissions/" + studentId + "/attachments/" + attachment + "/download", teacher, null), 404);
        assertThat(send("GET", "/api/v1/student/assignments/" + id + "/submissions/attachments/" + replacementId + "/download", student, null).statusCode()).isEqualTo(200);
        attachmentCleanupJob.deletePending();
        assertThat(objects).doesNotContainKey(oldKey);

        JsonNode textOnly = expect(send("POST", "/api/v1/student/assignments/" + id + "/submissions", student,
                Map.of("answerText", "Final synthetic answer")), 200);
        assertThat(textOnly.path("attachments").size()).isZero();
        expect(send("GET", "/api/v1/student/assignments/" + id + "/submissions/attachments/" + replacementId + "/download", student, null), 404);
        attachmentCleanupJob.deletePending();
    }

    @Test
    void submissionWorksWithPrepublishedAssignmentFixture() throws Exception {
        String id = assignmentPublishedBeforeEnrollment();
        expect(send("POST", "/api/v1/student/assignments/" + id + "/submissions", student, Map.of("answerText", "Synthetic answer")), 200);
        JsonNode stats = expect(send("GET", "/api/v1/teacher/assignments/" + id + "/submissions", teacher, null), 200);
        assertThat(stats.path("submittedCount").asInt()).isEqualTo(1);
        assertThat(stats.path("onTimeCount").asInt()).isEqualTo(1);
    }

    @Test
    void notificationReadWorksWithSyntheticNotificationFixture() throws Exception {
        UUID id = UUID.randomUUID();
        notifications.save(new com.studyflow.notification.domain.StudentNotification(id, studentId,
                com.studyflow.notification.domain.NotificationType.STUDY_PLAN_DEADLINE,
                "QA reminder", "Synthetic notification", "STUDY_PLAN_ITEM", UUID.randomUUID(),
                Instant.now().plusSeconds(3600), null, Instant.now()));
        expect(send("GET", "/api/v1/student/notifications?unreadOnly=true", student, null), 200);
        expect(send("PATCH", "/api/v1/student/notifications/" + id + "/read", student, null), 200);
        expect(send("PATCH", "/api/v1/student/notifications/" + id + "/read", otherStudent, null), 404);
    }

    @Test
    void implementedEnrollmentDecisionAndToggleRoutes() throws Exception {
        JsonNode course = createCourse();
        String offering = course.path("id").asText();
        String enrollment = expect(send("POST", "/api/v1/student/course-enrollments/join", otherStudent,
                Map.of("joinCode", course.path("rawJoinCode").asText())), 201).path("id").asText();
        expect(send("POST", "/api/v1/teacher/enrollments/" + enrollment + "/reject", teacher, Map.of("reason", "Synthetic reason")), 200);
        expect(send("POST", "/api/v1/student/course-enrollments/join", otherStudent,
                Map.of("joinCode", course.path("rawJoinCode").asText())), 201);
        expect(send("POST", "/api/v1/teacher/enrollments/approve-batch", teacher,
                Map.of("courseOfferingId", offering, "enrollmentIds", List.of(enrollment))), 200);
        expect(send("POST", "/api/v1/teacher/enrollments/" + enrollment + "/remove", teacher, Map.of("reason", "Synthetic removal")), 200);
        expect(send("PATCH", "/api/v1/teacher/course-offerings/" + offering + "/join-code/toggle", teacher, Map.of("enabled", false)), 200);
    }

    @Test
    void privatePdfPublicationAndStudentDownloadThroughHttp() throws Exception {
        String offering = approvedCourse();
        byte[] pdf = syntheticPdf();
        String doc = expect(multipart("/api/v1/teacher/documents", teacher, "file", pdf, "Synthetic PDF"), 201).path("id").asText();
        assertThat(expect(send("GET", "/api/v1/teacher/notifications?size=100", teacher, null), 200)
                .path("items").findValuesAsText("type")).contains("TEACHER_MATERIAL_UPLOADED");
        expect(send("GET", "/api/v1/teacher/documents", teacher, null), 200);
        var own = send("GET", "/api/v1/teacher/documents/" + doc + "/download", teacher, null);
        assertThat(own.statusCode()).isEqualTo(200);
        assertThat(own.body()).isEqualTo(pdf);
        expect(send("POST", "/api/v1/teacher/documents/" + doc + "/publications", teacher,
                Map.of("courseOfferingIds", List.of(offering))), 409);
        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status ->
                documents.findById(UUID.fromString(doc)).orElseThrow().markReady(1, Instant.now()));
        expect(send("POST", "/api/v1/teacher/documents/" + doc + "/publications", teacher,
                Map.of("courseOfferingIds", List.of(offering))), 204);
        assertThat(expect(send("GET", "/api/v1/student/notifications?size=100", student, null), 200)
                .path("items").findValuesAsText("type")).contains("STUDENT_MATERIAL_PUBLISHED");
        expect(send("GET", "/api/v1/student/materials", student, null), 200);
        JsonNode visible = expect(send("GET", "/api/v1/student/course-offerings/" + offering + "/materials", student, null), 200);
        assertThat(visible.path("items").size()).isEqualTo(1);
        var downloaded = send("GET", "/api/v1/student/materials/" + doc + "/download?download=true", student, null);
        assertThat(downloaded.statusCode()).isEqualTo(200);
        assertThat(downloaded.body()).isEqualTo(pdf);
        assertThat(downloaded.headers().firstValue("content-disposition").orElse("")).startsWith("attachment");
        expect(send("DELETE", "/api/v1/teacher/documents/" + doc + "/publications?offeringId=" + offering, teacher, null), 204);
        assertThat(expect(send("GET", "/api/v1/student/notifications?size=100", student, null), 200)
                .path("items").findValuesAsText("type")).contains("STUDENT_MATERIAL_REVOKED");
        expect(send("GET", "/api/v1/student/materials/" + doc + "/download", student, null), 403);
    }

    @Test
    void unpublishedAndForeignDocumentsReturn403Not500() throws Exception {
        String doc = expect(multipart("/api/v1/teacher/documents", teacher, "file", syntheticPdf(), "Private PDF"), 201).path("id").asText();
        var deniedStudent = send("GET", "/api/v1/student/materials/" + doc + "/download", student, null);
        var deniedTeacher = send("GET", "/api/v1/teacher/documents/" + doc + "/download", otherTeacher, null);
        org.assertj.core.api.SoftAssertions softly = new org.assertj.core.api.SoftAssertions();
        softly.assertThat(deniedStudent.statusCode()).as("unpublished document student access").isEqualTo(403);
        softly.assertThat(deniedTeacher.statusCode()).as("other teacher document access").isEqualTo(403);
        softly.assertAll();
    }

    @Test
    void studyPlanCalendarAndItemLifecycle() throws Exception {
        String offering = approvedCourse();
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        Map<String, String> plan = Map.of("title", "QA plan", "startDate", today.toString(), "endDate", today.plusDays(7).toString());
        String id = expect(send("POST", "/api/v1/study-plans", student, plan), 201).path("id").asText();
        expect(send("GET", "/api/v1/study-plans", student, null), 200);
        expect(send("GET", "/api/v1/study-plans/" + id, student, null), 200);
        expect(send("GET", "/api/v1/study-plans/" + id, otherStudent, null), 404);
        Map<String, String> update = new HashMap<>(plan);
        update.put("status", "ACTIVE");
        expect(send("PUT", "/api/v1/study-plans/" + id, student, update), 200);
        Map<String, String> task = Map.of("title", "Synthetic task", "type", "TASK",
                "dueAt", Instant.now().plusSeconds(7200).toString(), "courseOfferingId", offering);
        expect(send("POST", "/api/v1/study-plans/" + id + "/items", student,
                Map.of("title", "Foreign class task", "type", "TASK",
                        "dueAt", Instant.now().plusSeconds(7200).toString(),
                        "courseOfferingId", UUID.randomUUID().toString())), 403);
        JsonNode created = expect(send("POST", "/api/v1/study-plans/" + id + "/items", student, task), 201);
        String item = created.path("id").asText();
        assertThat(created.path("courseOfferingId").asText()).isEqualTo(offering);
        expect(send("GET", "/api/v1/study-plans/" + id + "/items", student, null), 200);
        expect(send("PUT", "/api/v1/study-plans/" + id + "/items/" + item, student, task), 200);
        expect(send("PATCH", "/api/v1/study-plan-items/" + item + "/status", student, Map.of("status", "COMPLETED"),
                Map.of("Idempotency-Key", "qa-complete-" + item)), 200);
        expect(send("GET", "/api/v1/calendar?from=" + Instant.now().minusSeconds(60) + "&to=" + Instant.now().plusSeconds(86400), student, null), 200);
        expect(send("DELETE", "/api/v1/study-plans/" + id + "/items/" + item + "/remove", student, null), 204);
        JsonNode afterRemoval = expect(send("GET", "/api/v1/study-plans/" + id + "/items", student, null), 200);
        assertThat(afterRemoval.path("items").toString()).doesNotContain(item);
        UUID itemId = UUID.fromString(item);
        List<UUID> relatedNoticeIds = jdbc.query(
                "SELECT id FROM app.notifications WHERE user_id = ? AND source_type = 'STUDY_PLAN_ITEM' AND source_id = ?",
                (result, row) -> result.getObject("id", UUID.class), studentId, itemId);
        assertThat(relatedNoticeIds).isNotEmpty();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM app.learning_events WHERE student_id = ? AND event_type = 'STUDY_TASK_COMPLETED' AND source_type = 'STUDY_PLAN_ITEM' AND source_id = ?",
                Long.class, studentId, itemId)).isEqualTo(1L);
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM app.notification_email_outbox WHERE notification_id = ?",
                Long.class, relatedNoticeIds.get(0))).isEqualTo(1L);
        expect(send("DELETE", "/api/v1/study-plans/" + id + "/items/" + item + "/permanently", student, null), 204);
        expect(send("DELETE", "/api/v1/study-plans/" + id + "/items/" + item + "/permanently", student, null), 204);
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM app.study_plan_items WHERE id = ?", Long.class, itemId)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM app.learning_events WHERE student_id = ? AND event_type = 'STUDY_TASK_COMPLETED' AND source_type = 'STUDY_PLAN_ITEM' AND source_id = ?",
                Long.class, studentId, itemId)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM app.notifications WHERE user_id = ? AND source_type = 'STUDY_PLAN_ITEM' AND source_id = ?",
                Long.class, studentId, itemId)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM app.notification_email_outbox WHERE notification_id = ?",
                Long.class, relatedNoticeIds.get(0))).isZero();
        String cancelled = expect(send("POST", "/api/v1/study-plans/" + id + "/items", student,
                Map.of("title", "Cancelled task", "type", "TASK", "dueAt", Instant.now().plusSeconds(9000).toString())), 201)
                .path("id").asText();
        expect(send("DELETE", "/api/v1/study-plans/" + id + "/items/" + cancelled, student, null), 204);
        JsonNode afterCancel = expect(send("GET", "/api/v1/study-plans/" + id + "/items", student, null), 200);
        assertThat(afterCancel.path("items").toString()).contains(cancelled);
        expect(send("DELETE", "/api/v1/study-plans/" + id, student, null), 204);
    }

    @Test
    void browserCorsPreflightPermitsConfiguredFrontend() throws Exception {
        var result = send("OPTIONS", "/api/v1/auth/login", null, null, Map.of(
                "Origin", "http://localhost:3000", "Access-Control-Request-Method", "POST",
                "Access-Control-Request-Headers", "content-type"));
        assertThat(result.statusCode()).as("login CORS preflight").isBetween(200, 299);
        assertThat(result.headers().firstValue("access-control-allow-origin")).contains("http://localhost:3000");
        assertThat(result.headers().firstValue("access-control-allow-credentials")).contains("true");
    }

    @Test
    void documentedJoinTogglePathExists() throws Exception {
        String offering = approvedCourse();
        expect(send("PATCH", "/api/v1/teacher/course-offerings/" + offering + "/join-code", teacher, Map.of("enabled", false)), 200);
    }

    @Test
    void documentedEnrollmentDeletePathExists() throws Exception {
        expect(send("DELETE", "/api/v1/teacher/enrollments/" + MISSING_ID, teacher, null), 404);
        JsonNode course = createCourse();
        String enrollment = expect(send("POST", "/api/v1/student/course-enrollments/join", student,
                Map.of("joinCode", course.path("rawJoinCode").asText())), 201).path("id").asText();
        expect(send("POST", "/api/v1/teacher/enrollments/" + enrollment + "/approve", teacher, null), 200);
        expect(send("DELETE", "/api/v1/teacher/enrollments/" + enrollment, otherTeacher, null), 403);
        assertThat(expect(send("DELETE", "/api/v1/teacher/enrollments/" + enrollment, teacher, null), 200)
                .path("status").asText()).isEqualTo("REMOVED");
    }

    @Test
    void unknownResourceHas404EnvelopeNotInternalError() throws Exception {
        JsonNode error = expect(send("GET", "/api/v1/qa-nonexistent-route", student, null), 404);
        assertThat(error.path("code").asText()).isEqualTo("NOT_FOUND");
        assertThat(error.path("details").isArray()).isTrue();
        assertThat(error.path("traceId").asText()).isNotBlank();
        expect(send("GET", "/api/v1/teacher/documents/" + MISSING_ID + "/download", teacher, null), 404);
    }

    @Test
    void corsRejectsUntrustedOriginsAndStillRequiresSession() throws Exception {
        var denied = send("OPTIONS", "/api/v1/auth/login", null, null, Map.of(
                "Origin", "https://untrusted.example.invalid", "Access-Control-Request-Method", "POST"));
        assertThat(denied.statusCode()).isEqualTo(403);
        assertThat(denied.headers().firstValue("access-control-allow-origin")).isEmpty();
        var allowedOriginButAnonymous = send("GET", "/api/v1/me", null, null, Map.of("Origin", "http://localhost:3000"));
        expect(allowedOriginButAnonymous, 401);
        assertThat(allowedOriginButAnonymous.headers().firstValue("access-control-allow-origin")).contains("http://localhost:3000");
        var preflight = send("OPTIONS", "/api/v1/study-plan-items/" + MISSING_ID + "/status", null, null,
                Map.of("Origin", "http://localhost:3000", "Access-Control-Request-Method", "PATCH",
                        "Access-Control-Request-Headers", "content-type,idempotency-key"));
        assertThat(preflight.statusCode()).isBetween(200, 299);
    }

    @Test
    void notificationRetriesPreserveReadStateAndAreConcurrentSafe() throws Exception {
        UUID source = UUID.randomUUID();
        Instant now = Instant.now();
        var transaction = new org.springframework.transaction.support.TransactionTemplate(transactions);
        var executor = java.util.concurrent.Executors.newFixedThreadPool(4);
        try {
            List<java.util.concurrent.Callable<Boolean>> writes = java.util.stream.IntStream.range(0, 8)
                    .mapToObj(index -> (java.util.concurrent.Callable<Boolean>) () -> transaction.execute(status ->
                            notifications.createDeadlineReminderIfAbsent(studentId, source, "QA concurrency", "Synthetic", now.plusSeconds(3600), now)))
                    .toList();
            int inserted = 0;
            for (var result : executor.invokeAll(writes)) if (Boolean.TRUE.equals(result.get(15, java.util.concurrent.TimeUnit.SECONDS))) inserted++;
            assertThat(inserted).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
        var found = notifications.findOwned(studentId, false, 0, 100).items().stream()
                .filter(item -> item.sourceId().equals(source)).toList();
        assertThat(found).hasSize(1);
        UUID notice = found.get(0).id();
        JsonNode read = expect(send("PATCH", "/api/v1/student/notifications/" + notice + "/read", student, null), 200);
        assertThat(Instant.parse(read.path("readAt").asText())).isNotNull();
        Instant storedReadAt = notifications.findOwned(notice, studentId).orElseThrow().readAt();
        assertThat(storedReadAt).isNotNull();
        assertThat(transaction.<Boolean>execute(status -> notifications.createDeadlineReminderIfAbsent(studentId, source,
                "Changed title", "Changed message", now.plusSeconds(7200), now.plusSeconds(1)))).isFalse();
        var preserved = notifications.findOwned(notice, studentId).orElseThrow();
        assertThat(preserved.title()).isEqualTo("QA concurrency");
        assertThat(preserved.readAt()).isEqualTo(storedReadAt);
        assertThat(transaction.<Boolean>execute(status -> notifications.createAssignmentPublishedIfAbsent(studentId, source,
                "QA task", now.plusSeconds(3600), now))).isTrue();
        assertThat(transaction.<Boolean>execute(status -> notifications.createAssignmentPublishedIfAbsent(studentId, source,
                "QA task", now.plusSeconds(3600), now))).isFalse();
        assertThat(transaction.<Boolean>execute(status -> notifications.createAssignmentDeadlineReminderIfAbsent(studentId, source,
                "QA task", now.plusSeconds(3600), now))).isTrue();
        assertThat(transaction.<Boolean>execute(status -> notifications.createAssignmentDeadlineReminderIfAbsent(studentId, source,
                "QA task", now.plusSeconds(3600), now))).isFalse();
    }

    @Test
    void invalidPdfHas422NotInternalError() throws Exception {
        expect(multipart("/api/v1/teacher/documents", teacher, "file", "not-pdf".getBytes(StandardCharsets.UTF_8), "Invalid fixture"), 422);
    }

    @Test
    void authenticatedReadEndpointsDoNotCrash() throws Exception {
        org.assertj.core.api.SoftAssertions softly = new org.assertj.core.api.SoftAssertions();
        for (String path : actualRoutes().stream().filter(route -> route.startsWith("GET ")).map(route -> route.substring(4)).toList()) {
            String concrete = path.replaceAll("\\{[^}]+}", MISSING_ID);
            if (concrete.endsWith("/calendar")) concrete += "?from=" + Instant.now() + "&to=" + Instant.now().plusSeconds(86400);
            String session = path.contains("/teacher/") ? teacher : path.contains("/admin/") ? admin : student;
            var result = send("GET", concrete, session, null);
            softly.assertThat(result.statusCode()).as("GET %s", path).isLessThan(500);
        }
        softly.assertAll();
    }

    @Test
    void auditDocumentedRouteAvailability() throws Exception {
        String contract = Files.readString(Path.of("../../docs/api-plan.md"));
        Set<String> documented = new TreeSet<>();
        var inline = Pattern.compile("(GET|POST|PUT|PATCH|DELETE)(?:/(GET|POST|PUT|PATCH|DELETE))? (/api/v1/[^`\\s]+)").matcher(contract);
        while (inline.find()) {
            documented.add(normalize(inline.group(1) + " " + inline.group(3)));
            if (inline.group(2) != null) documented.add(normalize(inline.group(2) + " " + inline.group(3)));
        }
        var table = Pattern.compile("\\| (GET|POST|PUT|PATCH|DELETE)(?:/(GET|POST|PUT|PATCH|DELETE))? \\| `(/api/v1/[^`]+)`").matcher(contract);
        while (table.find()) {
            documented.add(normalize(table.group(1) + " " + table.group(3)));
            if (table.group(2) != null) documented.add(normalize(table.group(2) + " " + table.group(3)));
        }
        Set<String> actual = actualRoutes();
        Set<String> normalized = new TreeSet<>();
        actual.forEach(route -> normalized.add(normalize(route)));
        actual.forEach(route -> System.out.println("QA_REGISTERED " + route));
        int missing = 0;
        for (String route : documented) {
            if (!normalized.contains(route)) {
                missing++;
                System.out.println("QA_MISSING " + route);
                String method = route.substring(0, route.indexOf(' '));
                String path = route.substring(route.indexOf(' ') + 1).replace("{id}", MISSING_ID);
                // Send only absent-route probes against the isolated application, never a production target.
                String session = path.contains("/teacher/") ? teacher : path.contains("/admin/") ? admin : student;
                send(method, path, session, method.equals("GET") || method.equals("DELETE") ? null : Map.of());
            }
        }
        System.out.printf("QA_INVENTORY registered=%d documentedExplicit=%d missing=%d%n", actual.size(), documented.size(), missing);
        assertThat(actual).isNotEmpty(); // Inventory is diagnostic, not a claim that missing APIs work.
    }

    /** No args; reports exercised method/template pairs. Output void, no files/secrets written. */
    @AfterAll
    void reportCoverage() {
        Set<String> actual = actualRoutes();
        Set<String> normalized = new TreeSet<>();
        actual.forEach(route -> normalized.add(normalize(route)));
        Set<String> exercised = new TreeSet<>(called);
        exercised.retainAll(normalized);
        normalized.removeAll(called);
        normalized.forEach(route -> System.out.println("QA_NOT_EXERCISED " + route));
        System.out.printf("QA_COVERAGE exercisedRegistered=%d notExercised=%d%n", exercised.size(), normalized.size());
    }

    /** Args: synthetic username and role. Input: isolated database. Output: real HTTP session cookies; errors fail setup. */
    private String seedAndLogin(String username, UserRole role) throws Exception {
        Instant now = Instant.now();
        users.save(new UserAccount(UUID.randomUUID(), username + "@ptit.edu.vn", username,
                passwords.encode(PASSWORD), "QA " + role.name(), "Asia/Ho_Chi_Minh", role, UserStatus.ACTIVE, now, now, now));
        var response = send("POST", "/api/v1/auth/login", null, Map.of("identifier", username, "password", PASSWORD));
        expect(response, 204);
        return cookies(response);
    }

    /** No args; creates class and approves fixture student using HTTP. Output: class UUID; errors fail scenario. */
    private String approvedCourse() throws Exception {
        JsonNode course = createCourse();
        String id = course.path("id").asText();
        String enrollment = expect(send("POST", "/api/v1/student/course-enrollments/join", student,
                Map.of("joinCode", course.path("rawJoinCode").asText())), 201).path("id").asText();
        expect(send("POST", "/api/v1/teacher/enrollments/" + enrollment + "/approve", teacher, null), 200);
        return id;
    }

    /** No args. Output: fresh class response created through HTTP; failures abort only current scenario. */
    private JsonNode createCourse() throws Exception {
        return expect(send("POST", "/api/v1/teacher/course-offerings", teacher,
                Map.of("subjectId", subjectId, "semesterId", semesterId, "code", "QA-" + UUID.randomUUID().toString().substring(0, 8), "name", "QA course")), 201);
    }

    /**
     * No args. Output: published assignment ID with student subsequently approved, using HTTP only.
     * Separate downstream fixture avoids blocking submission tests on the known publication-notification failure.
     * Does not assert that publication with existing students succeeds. Errors abort scenario.
     */
    private String assignmentPublishedBeforeEnrollment() throws Exception {
        JsonNode course = createCourse();
        String offering = course.path("id").asText();
        String assignment = expect(send("POST", "/api/v1/teacher/course-offerings/" + offering + "/assignments", teacher,
                Map.of("title", "QA prepublished task", "description", "Synthetic task", "dueAt", Instant.now().plusSeconds(86400).toString())), 201).path("id").asText();
        expect(send("POST", "/api/v1/teacher/assignments/" + assignment + "/publish", teacher, null), 200);
        String enrollment = expect(send("POST", "/api/v1/student/course-enrollments/join", student,
                Map.of("joinCode", course.path("rawJoinCode").asText())), 201).path("id").asText();
        expect(send("POST", "/api/v1/teacher/enrollments/" + enrollment + "/approve", teacher, null), 200);
        return assignment;
    }

    /** Test-only exception observer. Leaves application handling unchanged; never prints exception messages or SQL. */
    @org.springframework.boot.test.context.TestConfiguration(proxyBeanMethods = false)
    static class Diagnostics implements org.springframework.web.servlet.config.annotation.WebMvcConfigurer {
        /** Args: mutable resolver chain. Output void; observes exception class/SQL state and delegates unchanged. Errors: none. */
        @Override
        public void extendHandlerExceptionResolvers(List<org.springframework.web.servlet.HandlerExceptionResolver> resolvers) {
            resolvers.add(0, (request, response, handler, exception) -> {
                Throwable root = exception;
                while (root.getCause() != null && root.getCause() != root) root = root.getCause();
                String state = root instanceof java.sql.SQLException sql ? sql.getSQLState() : "none";
                System.out.printf("QA_EXCEPTION %s %s type=%s root=%s sqlState=%s%n", request.getMethod(),
                        normalize(request.getRequestURI()), exception.getClass().getSimpleName(), root.getClass().getSimpleName(), state);
                return null;
            });
        }
    }

    /** Args: method/path, optional session/JSON fixture. Output: real response; network/JSON exceptions fail test. */
    private HttpResponse<byte[]> send(String method, String path, String session, Object body) throws Exception {
        return send(method, path, session, body, Map.of());
    }

    /** Args: method/path/session/JSON body and extra headers. Output: response; logs only safe route/status. Errors: I/O. */
    private HttpResponse<byte[]> send(String method, String path, String session, Object body, Map<String, String> headers) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(20));
        if (session != null) request.header("Cookie", session);
        headers.forEach(request::header);
        if (body != null) request.header("Content-Type", "application/json");
        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(body)));
        var response = client.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
        recordCall(method, path, response.statusCode());
        return response;
    }

    /** Args: upload path/session, file part name and synthetic bytes, optional title. Output: HTTP response; errors fail test. */
    private HttpResponse<byte[]> multipart(String path, String session, String field, byte[] bytes, String title) throws Exception {
        String boundary = "qa-" + UUID.randomUUID();
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        if (title != null) body.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"title\"\r\n\r\n" + title + "\r\n").getBytes(StandardCharsets.UTF_8));
        body.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + field + "\"; filename=\"synthetic.pdf\"\r\nContent-Type: application/pdf\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        body.write(bytes);
        body.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(20))
                .header("Cookie", session).header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray())).build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
        recordCall("POST", path, response.statusCode());
        return response;
    }

    /** Args: method/path/status. Output void; records only safe path without identifiers/query/body. Errors: none. */
    private void recordCall(String method, String path, int status) {
        String route = normalize(method + " " + path);
        called.add(route);
        System.out.println("QA_HTTP " + route + " -> " + status);
    }

    /** Args: response and expected status. Output: parsed JSON or empty object; mismatch/invalid JSON fails test. */
    private JsonNode expect(HttpResponse<byte[]> response, int expected) throws Exception {
        assertThat(response.statusCode()).as("HTTP %s %s", response.request().method(), normalize(response.uri().getPath())).isEqualTo(expected);
        return response.body().length == 0 ? json.createObjectNode() : json.readTree(response.body());
    }

    /** Args: login/refresh response. Output: cookie header held in memory only. Errors: missing cookies fail test. */
    private static String cookies(HttpResponse<byte[]> response) {
        List<String> values = response.headers().allValues("set-cookie");
        assertThat(values.size()).isGreaterThanOrEqualTo(2);
        return String.join("; ", values.stream().map(value -> value.split(";", 2)[0]).toList());
    }

    /** No args. Output: real registered method/path set; side effects/errors: none. */
    private Set<String> actualRoutes() {
        Set<String> routes = new TreeSet<>();
        mappings.getHandlerMethods().keySet().forEach(mapping -> mapping.getPatternValues().stream()
                .filter(path -> path.startsWith("/api/v1/")).forEach(path -> mapping.getMethodsCondition().getMethods()
                        .forEach(method -> routes.add(method.name() + " " + path))));
        return routes;
    }

    /** Args: method/path or path. Output: query-free normalized route; no mutation or errors. */
    private static String normalize(String route) {
        return route.split("\\?", 2)[0].replaceAll("\\{[^}]+}", "{id}")
                .replaceAll("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", "{id}");
    }

    /** No args. Output: one-page text PDF bytes entirely synthetic; errors: PDFBox I/O fails test. */
    private static byte[] syntheticPdf() throws Exception {
        try (PDDocument pdf = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            pdf.addPage(new PDPage());
            try (PDPageContentStream page = new PDPageContentStream(pdf, pdf.getPage(0))) {
                page.beginText();
                page.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                page.newLineAtOffset(40, 700);
                page.showText("Synthetic StudyFlow HTTP test document");
                page.endText();
            }
            pdf.save(out);
            return out.toByteArray();
        }
    }
}
