package com.studyflow.admin.infrastructure;

import com.studyflow.admin.api.AdminModels;
import com.studyflow.admin.api.AdminModels.Page;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/** Typed app-schema persistence adapter for Admin operations; all user values are bound parameters. */
@Repository
public class AdminJdbcStore {
    private final JdbcTemplate jdbc;

    /** Args: Spring JDBC client. Input: app-schema data source. Output: store. Errors: none. */
    public AdminJdbcStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Args: none. Output: safe aggregate counts. Errors: database failures. */
    public AdminModels.Dashboard dashboard() {
        return jdbc.queryForObject("""
                SELECT (SELECT COUNT(*) FROM app.users) AS users,
                       (SELECT COUNT(*) FROM app.users WHERE role = 'STUDENT') AS students,
                       (SELECT COUNT(*) FROM app.users WHERE role = 'TEACHER') AS teachers,
                       (SELECT COUNT(*) FROM app.course_offerings WHERE status = 'ACTIVE') AS active_offerings,
                       (SELECT COUNT(*) FROM app.course_enrollments WHERE status = 'PENDING') AS pending_enrollments,
                       (SELECT COUNT(DISTINCT document_id) FROM app.document_publications
                           WHERE status = 'PUBLISHED') AS published_documents,
                       (SELECT COUNT(*) FROM app.feedback_reports WHERE status = 'OPEN') AS open_feedback
                """, (rs, row) -> new AdminModels.Dashboard(rs.getLong("users"), rs.getLong("students"),
                rs.getLong("teachers"), rs.getLong("active_offerings"), rs.getLong("pending_enrollments"),
                rs.getLong("published_documents"), rs.getLong("open_feedback")));
    }

    /** Args: optional validated role/status, page and size. Output: bounded account metadata. Errors: database failures. */
    public Page<AdminModels.User> users(String role, String status, int page, int size) {
        StringBuilder filter = new StringBuilder(" WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (role != null) { filter.append(" AND role = ?"); args.add(role); }
        if (status != null) { filter.append(" AND status = ?"); args.add(status); }
        return page("SELECT id,email,username,full_name,role,status,created_at FROM app.users" + filter,
                "SELECT COUNT(*) FROM app.users" + filter, args, "created_at DESC, id", page, size,
                AdminJdbcStore::user);
    }

    /** Args: account UUID. Output: optional safe metadata. Errors: database failures. */
    public Optional<AdminModels.User> user(UUID id) {
        return jdbc.query("SELECT id,email,username,full_name,role,status,created_at FROM app.users WHERE id = ?",
                AdminJdbcStore::user, id).stream().findFirst();
    }

    /** Args: account UUID, validated role/status and time. Output: affected row count. Errors: database failures. */
    public int updateUser(UUID id, String role, String status, Instant now) {
        return jdbc.update("UPDATE app.users SET role = ?, status = ?, updated_at = ? WHERE id = ?",
                role, status, Timestamp.from(now), id);
    }

    /** Args: account UUID and time. Output: void; revokes all still-active refresh tokens. Errors: database failures. */
    public void revokeRefreshTokens(UUID id, Instant now) {
        jdbc.update("UPDATE app.refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
                Timestamp.from(now), id);
    }

    /** Args: Teacher UUID. Output: whether active classes prevent role removal. Errors: database failures. */
    public boolean hasActiveTeacherClasses(UUID id) {
        return count("SELECT COUNT(*) FROM app.course_offerings WHERE teacher_id = ? AND status = 'ACTIVE'", id) > 0;
    }

    /** Args: page and size. Output: bounded Subject catalog. Errors: database failures. */
    public Page<AdminModels.Subject> subjects(int page, int size) {
        return page("SELECT id,code,name,credits,description,status FROM app.subjects",
                "SELECT COUNT(*) FROM app.subjects", List.of(), "code", page, size, AdminJdbcStore::subject);
    }

    /** Args: Subject UUID. Output: optional catalog entry. Errors: database failures. */
    public Optional<AdminModels.Subject> subject(UUID id) {
        return jdbc.query("SELECT id,code,name,credits,description,status FROM app.subjects WHERE id = ?",
                AdminJdbcStore::subject, id).stream().findFirst();
    }

    /** Args: code and optional excluded UUID. Output: true when code is already used. Errors: database failures. */
    public boolean subjectCodeExists(String code, UUID exceptId) {
        return count("SELECT COUNT(*) FROM app.subjects WHERE lower(code) = lower(?) AND (?::uuid IS NULL OR id <> ?)",
                code, exceptId, exceptId) > 0;
    }

    /** Args: validated Subject and time. Output: void; inserts catalog entry. Errors: unique/data failures. */
    public void insertSubject(AdminModels.Subject value, Instant now) {
        jdbc.update("""
                INSERT INTO app.subjects (id,code,name,credits,description,status,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?)
                """, value.id(), value.code(), value.name(), value.credits(), value.description(), value.status(),
                Timestamp.from(now), Timestamp.from(now));
    }

    /** Args: validated Subject and time. Output: void; updates catalog entry. Errors: unique/data failures. */
    public void updateSubject(AdminModels.Subject value, Instant now) {
        jdbc.update("""
                UPDATE app.subjects SET code=?, name=?, credits=?, description=?, status=?, updated_at=? WHERE id=?
                """, value.code(), value.name(), value.credits(), value.description(), value.status(),
                Timestamp.from(now), value.id());
    }

    /** Args: Subject UUID. Output: whether any offering references it. Errors: database failures. */
    public boolean subjectInUse(UUID id) {
        return count("SELECT COUNT(*) FROM app.course_offerings WHERE subject_id = ?", id) > 0;
    }

    /** Args: unused Subject UUID. Output: void; physically removes the entry. Errors: FK/data failures. */
    public void deleteSubject(UUID id) { jdbc.update("DELETE FROM app.subjects WHERE id = ?", id); }

    /** Args: page and size. Output: bounded Semester catalog. Errors: database failures. */
    public Page<AdminModels.Semester> semesters(int page, int size) {
        return page("""
                SELECT id,code,name,academic_year,start_date,end_date,status,offering_creation_enabled
                FROM app.semesters
                """, "SELECT COUNT(*) FROM app.semesters", List.of(), "start_date DESC, code", page, size,
                AdminJdbcStore::semester);
    }

    /** Args: Semester UUID. Output: optional catalog entry. Errors: database failures. */
    public Optional<AdminModels.Semester> semester(UUID id) {
        return jdbc.query("""
                SELECT id,code,name,academic_year,start_date,end_date,status,offering_creation_enabled
                FROM app.semesters WHERE id = ?
                """, AdminJdbcStore::semester, id).stream().findFirst();
    }

    /** Args: code and optional excluded UUID. Output: true when code is used. Errors: database failures. */
    public boolean semesterCodeExists(String code, UUID exceptId) {
        return count("SELECT COUNT(*) FROM app.semesters WHERE lower(code) = lower(?) AND (?::uuid IS NULL OR id <> ?)",
                code, exceptId, exceptId) > 0;
    }

    /** Args: validated Semester and time. Output: void; inserts catalog entry. Errors: unique/data failures. */
    public void insertSemester(AdminModels.Semester value, Instant now) {
        jdbc.update("""
                INSERT INTO app.semesters
                (id,code,name,academic_year,start_date,end_date,status,offering_creation_enabled,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)
                """, value.id(), value.code(), value.name(), value.academicYear(), value.startDate(), value.endDate(),
                value.status(), value.offeringCreationEnabled(), Timestamp.from(now), Timestamp.from(now));
    }

    /** Args: validated Semester and time. Output: void; updates catalog entry. Errors: unique/data failures. */
    public void updateSemester(AdminModels.Semester value, Instant now) {
        jdbc.update("""
                UPDATE app.semesters SET code=?,name=?,academic_year=?,start_date=?,end_date=?,status=?,
                    offering_creation_enabled=?,updated_at=? WHERE id=?
                """, value.code(), value.name(), value.academicYear(), value.startDate(), value.endDate(),
                value.status(), value.offeringCreationEnabled(), Timestamp.from(now), value.id());
    }

    /** Args: Semester UUID. Output: whether any offering references it. Errors: database failures. */
    public boolean semesterInUse(UUID id) {
        return count("SELECT COUNT(*) FROM app.course_offerings WHERE semester_id = ?", id) > 0;
    }

    /** Args: Semester UUID. Output: whether an ACTIVE offering prevents closure. Errors: database failures. */
    public boolean semesterHasActiveClasses(UUID id) {
        return count("SELECT COUNT(*) FROM app.course_offerings WHERE semester_id = ? AND status = 'ACTIVE'", id) > 0;
    }

    /** Args: unused Semester UUID. Output: void; removes it. Errors: FK/data failures. */
    public void deleteSemester(UUID id) { jdbc.update("DELETE FROM app.semesters WHERE id = ?", id); }

    /** Args: optional validated status, page and size. Output: safe offering list. Errors: database failures. */
    public Page<AdminModels.Offering> offerings(String status, int page, int size) {
        String filter = status == null ? "" : " WHERE o.status = ?";
        List<Object> args = status == null ? List.of() : List.of(status);
        return page(offeringSelect() + filter,
                "SELECT COUNT(*) FROM app.course_offerings o" + filter, args,
                "o.created_at DESC, o.id", page, size, AdminJdbcStore::offering);
    }

    /** Args: Offering UUID. Output: optional safe metadata. Errors: database failures. */
    public Optional<AdminModels.Offering> offering(UUID id) {
        return jdbc.query(offeringSelect() + " WHERE o.id = ?", AdminJdbcStore::offering, id)
                .stream().findFirst();
    }

    /** Args: Offering UUID, LOCKED or ARCHIVED and time. Output: changed row count, zero when not ACTIVE.
     * Errors: database failures. Side effect: disables join code and records transition timestamp. */
    public int transitionOffering(UUID id, String nextStatus, Instant now) {
        return jdbc.update("""
                UPDATE app.course_offerings SET status=?, join_enabled=FALSE,
                    locked_at=CASE WHEN ?='LOCKED' THEN ? ELSE locked_at END,
                    archived_at=CASE WHEN ?='ARCHIVED' THEN ? ELSE archived_at END,
                    updated_at=? WHERE id=? AND status='ACTIVE'
                """, nextStatus, nextStatus, Timestamp.from(now), nextStatus, Timestamp.from(now),
                Timestamp.from(now), id);
    }

    /** Args: authenticated reporter, validated report and time. Output: void; saves OPEN report. Errors: database failures. */
    public void insertFeedback(AdminModels.Feedback report, Instant now) {
        jdbc.update("""
                INSERT INTO app.feedback_reports
                    (id,reporter_id,type,title,content,status,created_at,updated_at)
                VALUES (?,?,?,?,?,'OPEN',?,?)
                """, report.id(), report.reporterId(), report.type(), report.title(), report.content(),
                Timestamp.from(now), Timestamp.from(now));
    }

    /** Args: optional validated status, page and size. Output: bounded reports. Errors: database failures. */
    public Page<AdminModels.Feedback> feedback(String status, int page, int size) {
        String filter = status == null ? "" : " WHERE status = ?";
        List<Object> args = status == null ? List.of() : List.of(status);
        return page("""
                SELECT id,reporter_id,type,title,content,status,resolution,created_at,updated_at
                FROM app.feedback_reports
                """ + filter, "SELECT COUNT(*) FROM app.feedback_reports" + filter, args,
                "created_at DESC, id", page, size, AdminJdbcStore::feedback);
    }

    /** Args: report UUID. Output: optional report. Errors: database failures. */
    public Optional<AdminModels.Feedback> feedback(UUID id) {
        return jdbc.query("""
                SELECT id,reporter_id,type,title,content,status,resolution,created_at,updated_at
                FROM app.feedback_reports WHERE id = ?
                """, AdminJdbcStore::feedback, id).stream().findFirst();
    }

    /** Args: report ID, status, resolution, Admin and time. Output: void; updates resolution. Errors: database failures. */
    public void updateFeedback(UUID id, String status, String resolution, UUID adminId, Instant now) {
        jdbc.update("""
                UPDATE app.feedback_reports SET status=?,resolution=?,resolved_by=?,updated_at=? WHERE id=?
                """, status, resolution, "RESOLVED".equals(status) ? adminId : null, Timestamp.from(now), id);
    }

    /** Args: page and size. Output: bounded audit metadata, newest first. Errors: database failures. */
    public Page<AdminModels.SystemLog> systemLogs(int page, int size) {
        return page("SELECT id,actor_id,action,target_type,target_id,status,trace_id,created_at FROM app.system_logs",
                "SELECT COUNT(*) FROM app.system_logs", List.of(), "created_at DESC, id", page, size,
                AdminJdbcStore::systemLog);
    }

    /** Args: actor, allowlisted action/target/status, optional trace and time.
     * Output: void; appends safe audit metadata within the caller transaction. Errors: database failures. */
    public void audit(UUID actorId, String action, String targetType, UUID targetId,
                      String status, String traceId, Instant now) {
        jdbc.update("""
                INSERT INTO app.system_logs (id,actor_id,action,target_type,target_id,status,trace_id,created_at)
                VALUES (?,?,?,?,?,?,?,?)
                """, UUID.randomUUID(), actorId, action, targetType, targetId, status, traceId, Timestamp.from(now));
    }

    /** Args: none. Output: current registration flag, false if configuration is missing. Errors: database failures. */
    public boolean registrationEnabled() {
        List<Boolean> values = jdbc.query("""
                SELECT boolean_value FROM app.system_settings WHERE setting_key='registration_enabled'
                """, (rs, row) -> rs.getBoolean(1));
        return !values.isEmpty() && values.get(0);
    }

    /** Args: desired registration flag, actor and time. Output: void; upserts allowlisted setting. Errors: database failures. */
    public void setRegistrationEnabled(boolean enabled, UUID adminId, Instant now) {
        jdbc.update("""
                INSERT INTO app.system_settings (setting_key,boolean_value,updated_by,updated_at)
                VALUES ('registration_enabled',?,?,?)
                ON CONFLICT (setting_key) DO UPDATE SET boolean_value=EXCLUDED.boolean_value,
                    updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at
                """, enabled, adminId, Timestamp.from(now));
    }

    /** Args: SQL/count SQL containing only fixed predicates, bound filters, sort, page/size and row mapper.
     * Output: typed bounded page. Errors: database failures; caller validates pagination. */
    private <T> Page<T> page(String sql, String countSql, List<Object> args, String orderBy,
                             int page, int size, RowMapper<T> mapper) {
        long total = count(countSql, args.toArray());
        List<Object> values = new ArrayList<>(args);
        values.add(size);
        values.add((long) page * size);
        List<T> items = jdbc.query(sql + " ORDER BY " + orderBy + " LIMIT ? OFFSET ?", mapper, values.toArray());
        return new Page<>(items, page, size, total, (int) ((total + size - 1) / size));
    }

    /** Args: fixed count SQL and bound values. Output: count. Errors: database failures. */
    private long count(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    /** Args: JDBC row. Output: safe User DTO. Errors: SQL read failure. */
    private static AdminModels.User user(ResultSet rs, int row) throws SQLException {
        return new AdminModels.User((UUID) rs.getObject("id"), rs.getString("email"), rs.getString("username"),
                rs.getString("full_name"), rs.getString("role"), rs.getString("status"),
                rs.getTimestamp("created_at").toInstant());
    }

    /** Args: JDBC row. Output: Subject DTO. Errors: SQL read failure. */
    private static AdminModels.Subject subject(ResultSet rs, int row) throws SQLException {
        return new AdminModels.Subject((UUID) rs.getObject("id"), rs.getString("code"), rs.getString("name"),
                rs.getInt("credits"), rs.getString("description"), rs.getString("status"));
    }

    /** Args: JDBC row. Output: Semester DTO. Errors: SQL read failure. */
    private static AdminModels.Semester semester(ResultSet rs, int row) throws SQLException {
        return new AdminModels.Semester((UUID) rs.getObject("id"), rs.getString("code"), rs.getString("name"),
                rs.getString("academic_year"), rs.getDate("start_date").toLocalDate(),
                rs.getDate("end_date").toLocalDate(), rs.getString("status"),
                rs.getBoolean("offering_creation_enabled"));
    }

    /** Args: none. Output: fixed safe Offering SELECT; no join-code columns. Errors: none. */
    private static String offeringSelect() {
        return """
                SELECT o.id,o.code,o.name,s.code AS subject_code,m.code AS semester_code,
                    o.teacher_id,u.full_name AS teacher_name,o.status,o.created_at,
                    (SELECT COUNT(*) FROM app.course_enrollments e
                     WHERE e.course_offering_id=o.id AND e.status='APPROVED') AS approved_students
                FROM app.course_offerings o JOIN app.subjects s ON s.id=o.subject_id
                JOIN app.semesters m ON m.id=o.semester_id JOIN app.users u ON u.id=o.teacher_id
                """;
    }

    /** Args: JDBC row. Output: safe Offering DTO. Errors: SQL read failure. */
    private static AdminModels.Offering offering(ResultSet rs, int row) throws SQLException {
        return new AdminModels.Offering((UUID) rs.getObject("id"), rs.getString("code"), rs.getString("name"),
                rs.getString("subject_code"), rs.getString("semester_code"),
                (UUID) rs.getObject("teacher_id"), rs.getString("teacher_name"), rs.getString("status"),
                rs.getLong("approved_students"), rs.getTimestamp("created_at").toInstant());
    }

    /** Args: JDBC row. Output: Feedback DTO. Errors: SQL read failure. */
    private static AdminModels.Feedback feedback(ResultSet rs, int row) throws SQLException {
        return new AdminModels.Feedback((UUID) rs.getObject("id"), (UUID) rs.getObject("reporter_id"),
                rs.getString("type"), rs.getString("title"), rs.getString("content"), rs.getString("status"),
                rs.getString("resolution"), rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }

    /** Args: JDBC row. Output: safe audit DTO. Errors: SQL read failure. */
    private static AdminModels.SystemLog systemLog(ResultSet rs, int row) throws SQLException {
        return new AdminModels.SystemLog((UUID) rs.getObject("id"), (UUID) rs.getObject("actor_id"),
                rs.getString("action"), rs.getString("target_type"), (UUID) rs.getObject("target_id"),
                rs.getString("status"), rs.getString("trace_id"), rs.getTimestamp("created_at").toInstant());
    }
}
