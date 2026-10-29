package com.studyflow.progress.application;

import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.progress.domain.LearningEventRepository;
import com.studyflow.progress.dto.StudentDashboardResponse;
import com.studyflow.progress.dto.StudentDashboardResponse.CourseProgress;
import com.studyflow.progress.dto.StudentDashboardResponse.UpcomingItem;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Aggregates Student dashboard values from authorized app-schema records. */
@Service
@Transactional(readOnly = true)
public class StudentDashboardService {
    private final StudyMetricsService metrics;
    private final LearningEventRepository events;
    private final CourseEnrollmentRepository enrollments;
    private final CourseOfferingRepository offerings;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    /** Args: required metric, event, enrollment and offering stores, JDBC client and clock.
     * Input: Spring managed dependencies. Output: initialized service. Errors: none. */
    public StudentDashboardService(StudyMetricsService metrics, LearningEventRepository events,
                                   CourseEnrollmentRepository enrollments, CourseOfferingRepository offerings,
                                   JdbcTemplate jdbc, Clock clock) {
        this.metrics = metrics;
        this.events = events;
        this.enrollments = enrollments;
        this.offerings = offerings;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /**
     * Args: authenticated Student UUID.
     * Input: only APPROVED enrollment and ACTIVE offerings contribute class content.
     * Output: current local date, streak/goal, lifetime totals, upcoming work and per-class progress.
     * Errors: persistence failure propagates; invalid user timezone uses the existing safe fallback.
     */
    public StudentDashboardResponse get(UUID studentId) {
        DailyGoalProgressDTO goal = metrics.getDailyGoalProgress(studentId);
        StreakDTO streak = metrics.getStreak(studentId);
        List<CourseOffering> classes = enrollments.findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED)
                .stream().map(enrollment -> offerings.findById(enrollment.getCourseOfferingId()).orElse(null))
                .filter(offering -> offering != null && offering.getStatus() == CourseOfferingStatus.ACTIVE)
                .distinct().sorted(Comparator.comparing(CourseOffering::getCode)).toList();
        List<CourseProgress> classProgress = classes.stream().map(offering -> courseProgress(studentId, offering)).toList();
        // Count pages, not documents. A publication in two classes is still one PDF in the overview.
        int totalPages = count("""
                SELECT COALESCE(SUM(d.page_count), 0) FROM app.documents d
                WHERE d.document_scope = 'COURSE_MATERIAL' AND d.processing_status = 'READY'
                  AND d.deleted_at IS NULL AND EXISTS (
                    SELECT 1 FROM app.document_publications p
                    JOIN app.course_offerings o ON o.id = p.course_offering_id
                    JOIN app.course_enrollments e ON e.course_offering_id = o.id
                    WHERE p.document_id = d.id AND p.status = 'PUBLISHED' AND o.status = 'ACTIVE'
                      AND e.student_id = ? AND e.status = 'APPROVED')
                """, studentId);
        int viewedPages = count("""
                SELECT COUNT(*) FROM app.course_material_page_views v WHERE v.student_id = ?
                  AND EXISTS (SELECT 1 FROM app.document_publications p
                    JOIN app.course_offerings o ON o.id = p.course_offering_id
                    JOIN app.course_enrollments e ON e.course_offering_id = o.id
                    JOIN app.documents d ON d.id = p.document_id
                    WHERE p.document_id = v.document_id AND p.status = 'PUBLISHED'
                      AND o.status = 'ACTIVE' AND e.student_id = v.student_id AND e.status = 'APPROVED'
                      AND d.deleted_at IS NULL AND d.processing_status = 'READY')
                """, studentId);
        TaskMetric personalTasks = taskMetric(studentId, null);
        TaskMetric assignedTasks = assignmentMetric(studentId, null);
        QuizMetric quizzes = quizMetric(studentId, null);
        StudentDashboardResponse.Overview overview = new StudentDashboardResponse.Overview(
                viewedPages, totalPages, personalTasks.completed() + assignedTasks.completed(),
                personalTasks.total() + assignedTasks.total(), quizzes.completed(), quizzes.average());
        return new StudentDashboardResponse(goal.date(), goal.timeZone(),
                new StudentDashboardResponse.Streak(streak.currentStreak(), streak.longestStreak(),
                        events.findDistinctActivityDatesByStudentId(studentId)),
                new StudentDashboardResponse.DailyGoal(goal.pageTarget(), goal.pageActual(),
                        goal.quizQuestionTarget(), goal.quizQuestionActual(), goal.taskTarget(), goal.taskActual()),
                overview, upcoming(studentId), classProgress);
    }

    /** Args: Student and one ACTIVE approved offering. Output: published-page, task and Quiz aggregates. Errors: persistence failure. */
    private CourseProgress courseProgress(UUID studentId, CourseOffering offering) {
        UUID id = offering.getId();
        int total = count("""
                SELECT COALESCE(SUM(d.page_count), 0) FROM app.document_publications p
                JOIN app.documents d ON d.id = p.document_id
                WHERE p.course_offering_id = ? AND p.status = 'PUBLISHED'
                  AND d.deleted_at IS NULL AND d.processing_status = 'READY'
                """, id);
        int viewed = count("""
                SELECT COUNT(*) FROM app.course_material_page_views v
                JOIN app.document_publications p ON p.document_id = v.document_id
                JOIN app.documents d ON d.id = v.document_id
                WHERE v.student_id = ? AND p.course_offering_id = ? AND p.status = 'PUBLISHED'
                  AND d.deleted_at IS NULL AND d.processing_status = 'READY'
                """, studentId, id);
        TaskMetric personal = taskMetric(studentId, id);
        TaskMetric assigned = assignmentMetric(studentId, id);
        QuizMetric quiz = quizMetric(studentId, id);
        int percent = total == 0 ? 0 : (int) Math.min(100, Math.round(viewed * 100.0 / total));
        return new CourseProgress(id, offering.getCode(), offering.getName(), viewed, total, percent,
                quiz.completed(), quiz.average(), personal.completed() + assigned.completed(),
                personal.total() + assigned.total());
    }

    /** Args: count SQL returning one numeric column and bound parameters. Output: nonnegative int. Errors: JDBC failures. */
    private int count(String sql, Object... args) {
        Number value = jdbc.queryForObject(sql, Number.class, args);
        return value == null ? 0 : value.intValue();
    }

    /** Args: Student and optional offering. Output: personal TODO/completed task totals. Errors: JDBC failures. */
    private TaskMetric taskMetric(UUID studentId, UUID offeringId) {
        String sql = """
                SELECT COUNT(*) FILTER (WHERE i.status = 'COMPLETED') AS completed, COUNT(*) AS total
                FROM app.study_plan_items i JOIN app.study_plans p ON p.id = i.plan_id
                WHERE p.student_id = ? AND i.status IN ('TODO', 'COMPLETED')
                """ + (offeringId == null ? "" : " AND i.course_offering_id = ?");
        return jdbc.queryForObject(sql, (rs, row) -> new TaskMetric(rs.getInt("completed"), rs.getInt("total")),
                offeringId == null ? new Object[]{studentId} : new Object[]{studentId, offeringId});
    }

    /** Args: Student and optional offering. Output: published assignment/submission totals. Errors: JDBC failures. */
    private TaskMetric assignmentMetric(UUID studentId, UUID offeringId) {
        String sql = """
                SELECT COUNT(s.id) AS completed, COUNT(*) AS total
                FROM app.course_assignments a
                JOIN app.course_offerings o ON o.id = a.course_offering_id
                JOIN app.course_enrollments e ON e.course_offering_id = o.id
                LEFT JOIN app.assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ?
                WHERE e.student_id = ? AND e.status = 'APPROVED'
                  AND o.status = 'ACTIVE' AND a.status = 'PUBLISHED'
                """ + (offeringId == null ? "" : " AND a.course_offering_id = ?");
        return jdbc.queryForObject(sql, (rs, row) -> new TaskMetric(rs.getInt("completed"), rs.getInt("total")),
                offeringId == null ? new Object[]{studentId, studentId}
                        : new Object[]{studentId, studentId, offeringId});
    }

    /** Args: Student and optional offering. Output: scored attempt count/average percentage. Errors: JDBC failures. */
    private QuizMetric quizMetric(UUID studentId, UUID offeringId) {
        String sql = """
                SELECT COUNT(*) AS completed, COALESCE(AVG(a.score), 0) AS average
                FROM app.quiz_attempts a JOIN app.quizzes q ON q.id = a.quiz_id
                WHERE a.student_id = ? AND a.status = 'SCORED'
                """ + (offeringId == null ? "" : " AND q.course_offering_id = ?");
        return jdbc.queryForObject(sql, (rs, row) -> new QuizMetric(rs.getInt("completed"),
                rs.getDouble("average")), offeringId == null ? new Object[]{studentId}
                : new Object[]{studentId, offeringId});
    }

    /** Args: Student. Output: next ten TODO items and unsubmited published assignments. Errors: JDBC failures. */
    private List<UpcomingItem> upcoming(UUID studentId) {
        Timestamp now = Timestamp.from(clock.instant());
        List<UpcomingItem> items = new ArrayList<>(jdbc.query("""
                SELECT i.id, i.title, COALESCE(i.due_at, i.scheduled_end) AS due_at, i.course_offering_id
                FROM app.study_plan_items i JOIN app.study_plans p ON p.id = i.plan_id
                WHERE p.student_id = ? AND i.status = 'TODO'
                  AND COALESCE(i.due_at, i.scheduled_end) >= ?
                ORDER BY due_at LIMIT 10
                """, (rs, row) -> new UpcomingItem((UUID) rs.getObject("id"), rs.getString("title"),
                rs.getTimestamp("due_at").toInstant(), "STUDY_PLAN_ITEM",
                (UUID) rs.getObject("course_offering_id")), studentId, now));
        items.addAll(jdbc.query("""
                SELECT a.id, a.title, a.due_at, a.course_offering_id
                FROM app.course_assignments a
                JOIN app.course_offerings o ON o.id = a.course_offering_id
                JOIN app.course_enrollments e ON e.course_offering_id = o.id
                LEFT JOIN app.assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ?
                WHERE e.student_id = ? AND e.status = 'APPROVED' AND o.status = 'ACTIVE'
                  AND a.status = 'PUBLISHED' AND s.id IS NULL AND a.due_at >= ?
                ORDER BY a.due_at LIMIT 10
                """, (rs, row) -> new UpcomingItem((UUID) rs.getObject("id"), rs.getString("title"),
                rs.getTimestamp("due_at").toInstant(), "COURSE_ASSIGNMENT",
                (UUID) rs.getObject("course_offering_id")), studentId, studentId, now));
        return items.stream().sorted(Comparator.comparing(UpcomingItem::dueAt)).limit(10).toList();
    }

    /** Internal aggregate: completed and total task counts. */
    private record TaskMetric(int completed, int total) { }
    /** Internal aggregate: completed Quiz count and average score. */
    private record QuizMetric(int completed, double average) { }
}
