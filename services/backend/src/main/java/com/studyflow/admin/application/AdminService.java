package com.studyflow.admin.application;

import com.studyflow.admin.api.AdminModels;
import com.studyflow.admin.api.AdminModels.Page;
import com.studyflow.admin.infrastructure.AdminJdbcStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ValidationException;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Validates Admin mutations and keeps their safe audit entries in the same app transaction. */
@Service
@Transactional
public class AdminService {
    private static final Set<String> ROLES = Set.of("STUDENT", "TEACHER", "ADMIN");
    private static final Set<String> USER_STATUSES = Set.of("ACTIVE", "LOCKED");
    private static final Set<String> SEMESTER_STATUSES = Set.of("UPCOMING", "ACTIVE", "CLOSED");
    private static final Set<String> OFFERING_STATUSES = Set.of("ACTIVE", "LOCKED", "ARCHIVED");
    private static final Set<String> FEEDBACK_STATUSES = Set.of("OPEN", "RESOLVED");
    private final AdminJdbcStore store;
    private final Clock clock;

    /** Args: required Admin store and clock. Input: Spring managed dependencies. Output: service. Errors: none. */
    public AdminService(AdminJdbcStore store, Clock clock) { this.store = store; this.clock = clock; }

    /** Args: none. Input: app-schema counts. Output: safe Dashboard. Errors: persistence failure. */
    @Transactional(readOnly = true)
    public AdminModels.Dashboard dashboard() { return store.dashboard(); }

    /** Args: optional role/status and bounded page/size. Output: account metadata page. Errors: INVALID_FILTER/PAGE. */
    @Transactional(readOnly = true)
    public Page<AdminModels.User> users(String role, String status, int page, int size) {
        checkPage(page, size);
        checkFilter(role, ROLES);
        checkFilter(status, USER_STATUSES);
        return store.users(role, status, page, size);
    }

    /**
     * Args: Admin actor, target account, optional role/status and request trace.
     * Input: target exists, mutation does not lock/demote current Admin or strand active Teacher classes.
     * Output: updated safe User; side effects revoke refresh sessions and append audit only on change.
     * Errors: 404 USER_NOT_FOUND, 409 SELF_ACCOUNT_CHANGE/TEACHER_HAS_ACTIVE_CLASSES,
     * 422 INVALID_USER_UPDATE, database failure.
     */
    public AdminModels.User updateUser(UUID actor, UUID id, AdminModels.UserUpdate input, String traceId) {
        if (input == null || (input.role() == null && input.status() == null)) {
            throw new ValidationException("INVALID_USER_UPDATE", "Cần chọn vai trò hoặc trạng thái tài khoản.");
        }
        AdminModels.User previous = store.user(id).orElseThrow(() -> missing("USER_NOT_FOUND", "Không tìm thấy tài khoản."));
        String role = input.role() == null ? previous.role() : input.role();
        String status = input.status() == null ? previous.status() : input.status();
        if (!ROLES.contains(role) || !USER_STATUSES.contains(status)) {
            throw new ValidationException("INVALID_USER_UPDATE", "Vai trò hoặc trạng thái không hợp lệ.");
        }
        if (role.equals(previous.role()) && status.equals(previous.status())) return previous;
        if (actor.equals(id)) throw conflict("SELF_ACCOUNT_CHANGE", "Không thể tự đổi vai trò hoặc khóa tài khoản của mình.");
        if ("TEACHER".equals(previous.role()) && store.hasActiveTeacherClasses(id)
                && (!"TEACHER".equals(role) || "LOCKED".equals(status))) {
            throw conflict("TEACHER_HAS_ACTIVE_CLASSES", "Giảng viên còn lớp đang hoạt động.");
        }
        Instant now = clock.instant();
        store.updateUser(id, role, status, now);
        store.revokeRefreshTokens(id, now);
        audit(actor, "USER_UPDATED", "USER", id, traceId);
        return store.user(id).orElseThrow(() -> missing("USER_NOT_FOUND", "Không tìm thấy tài khoản."));
    }

    /** Args: bounded page/size. Output: Subject page. Errors: INVALID_PAGE. */
    @Transactional(readOnly = true)
    public Page<AdminModels.Subject> subjects(int page, int size) {
        checkPage(page, size);
        return store.subjects(page, size);
    }

    /** Args: Admin, validated Subject fields and trace. Output: 201-ready Subject; side effect insert/audit.
     * Errors: 409 SUBJECT_CODE_EXISTS, 422 INVALID_SUBJECT. */
    public AdminModels.Subject createSubject(UUID actor, AdminModels.SubjectInput input, String traceId) {
        AdminModels.Subject value = subjectValue(UUID.randomUUID(), input, null);
        if (store.subjectCodeExists(value.code(), null)) throw conflict("SUBJECT_CODE_EXISTS", "Mã môn học đã tồn tại.");
        try {
            store.insertSubject(value, clock.instant());
        } catch (DataIntegrityViolationException exception) {
            throw conflict("SUBJECT_CODE_EXISTS", "Mã môn học đã tồn tại.");
        }
        audit(actor, "SUBJECT_CREATED", "SUBJECT", value.id(), traceId);
        return value;
    }

    /** Args: Admin, Subject ID, partial fields and trace. Output: updated Subject; side effect update/audit.
     * Errors: 404 SUBJECT_NOT_FOUND, 409 SUBJECT_CODE_EXISTS, 422 INVALID_SUBJECT. */
    public AdminModels.Subject updateSubject(UUID actor, UUID id, AdminModels.SubjectInput input, String traceId) {
        AdminModels.Subject old = store.subject(id).orElseThrow(() -> missing("SUBJECT_NOT_FOUND", "Không tìm thấy môn học."));
        AdminModels.Subject value = subjectValue(id, input, old);
        if (store.subjectCodeExists(value.code(), id)) throw conflict("SUBJECT_CODE_EXISTS", "Mã môn học đã tồn tại.");
        try {
            store.updateSubject(value, clock.instant());
        } catch (DataIntegrityViolationException exception) {
            throw conflict("SUBJECT_CODE_EXISTS", "Mã môn học đã tồn tại.");
        }
        audit(actor, "SUBJECT_UPDATED", "SUBJECT", id, traceId);
        return value;
    }

    /** Args: Admin, unused Subject ID and trace. Output: void; physically removes unused catalog entry and audits.
     * Errors: 404 SUBJECT_NOT_FOUND, 409 SUBJECT_IN_USE. */
    public void deleteSubject(UUID actor, UUID id, String traceId) {
        store.subject(id).orElseThrow(() -> missing("SUBJECT_NOT_FOUND", "Không tìm thấy môn học."));
        if (store.subjectInUse(id)) throw conflict("SUBJECT_IN_USE", "Môn học đang được lớp sử dụng.");
        try { store.deleteSubject(id); }
        catch (DataIntegrityViolationException exception) { throw conflict("SUBJECT_IN_USE", "Môn học đang được lớp sử dụng."); }
        audit(actor, "SUBJECT_DELETED", "SUBJECT", id, traceId);
    }

    /** Args: bounded page/size. Output: Semester page. Errors: INVALID_PAGE. */
    @Transactional(readOnly = true)
    public Page<AdminModels.Semester> semesters(int page, int size) {
        checkPage(page, size);
        return store.semesters(page, size);
    }

    /** Args: Admin, full Semester input and trace. Output: created Semester; side effect insert/audit.
     * Errors: 409 SEMESTER_CODE_EXISTS, 422 INVALID_SEMESTER. */
    public AdminModels.Semester createSemester(UUID actor, AdminModels.SemesterInput input, String traceId) {
        AdminModels.Semester value = semesterValue(UUID.randomUUID(), input, null);
        if (store.semesterCodeExists(value.code(), null)) throw conflict("SEMESTER_CODE_EXISTS", "Mã học kỳ đã tồn tại.");
        try { store.insertSemester(value, clock.instant()); }
        catch (DataIntegrityViolationException exception) { throw conflict("SEMESTER_CODE_EXISTS", "Mã học kỳ đã tồn tại."); }
        audit(actor, "SEMESTER_CREATED", "SEMESTER", value.id(), traceId);
        return value;
    }

    /** Args: Admin, Semester ID, partial input and trace. Output: updated Semester; side effect update/audit.
     * Errors: 404 SEMESTER_NOT_FOUND, 409 SEMESTER_HAS_ACTIVE_CLASSES/CODE_EXISTS, 422 INVALID_SEMESTER. */
    public AdminModels.Semester updateSemester(UUID actor, UUID id, AdminModels.SemesterInput input, String traceId) {
        AdminModels.Semester old = store.semester(id).orElseThrow(() -> missing("SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        AdminModels.Semester value = semesterValue(id, input, old);
        if (store.semesterCodeExists(value.code(), id)) throw conflict("SEMESTER_CODE_EXISTS", "Mã học kỳ đã tồn tại.");
        if (!"CLOSED".equals(old.status()) && "CLOSED".equals(value.status()) && store.semesterHasActiveClasses(id)) {
            throw conflict("SEMESTER_HAS_ACTIVE_CLASSES", "Học kỳ còn lớp đang hoạt động.");
        }
        try { store.updateSemester(value, clock.instant()); }
        catch (DataIntegrityViolationException exception) { throw conflict("SEMESTER_CODE_EXISTS", "Mã học kỳ đã tồn tại."); }
        audit(actor, "SEMESTER_UPDATED", "SEMESTER", id, traceId);
        return value;
    }

    /** Args: Admin, unused Semester ID and trace. Output: void; remove/audit. Errors: 404/409. */
    public void deleteSemester(UUID actor, UUID id, String traceId) {
        store.semester(id).orElseThrow(() -> missing("SEMESTER_NOT_FOUND", "Không tìm thấy học kỳ."));
        if (store.semesterInUse(id)) throw conflict("SEMESTER_IN_USE", "Học kỳ đang được lớp sử dụng.");
        try { store.deleteSemester(id); }
        catch (DataIntegrityViolationException exception) { throw conflict("SEMESTER_IN_USE", "Học kỳ đang được lớp sử dụng."); }
        audit(actor, "SEMESTER_DELETED", "SEMESTER", id, traceId);
    }

    /** Args: optional status and bounded page/size. Output: safe Offering metadata page. Errors: INVALID_FILTER/PAGE. */
    @Transactional(readOnly = true)
    public Page<AdminModels.Offering> offerings(String status, int page, int size) {
        checkPage(page, size);
        checkFilter(status, OFFERING_STATUSES);
        return store.offerings(status, page, size);
    }

    /** Args: Offering UUID. Output: safe metadata. Errors: 404 COURSE_NOT_FOUND. */
    @Transactional(readOnly = true)
    public AdminModels.Offering offering(UUID id) {
        return store.offering(id).orElseThrow(() -> missing("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
    }

    /** Args: Admin, Offering UUID, LOCKED/ARCHIVED and trace. Output: transitioned Offering; disables join.
     * Errors: 404 COURSE_NOT_FOUND, 409 COURSE_NOT_ACTIVE, 422 invalid target. */
    public AdminModels.Offering transitionOffering(UUID actor, UUID id, String nextStatus, String traceId) {
        if (nextStatus == null || !Set.of("LOCKED", "ARCHIVED").contains(nextStatus)) {
            throw new ValidationException("INVALID_COURSE_STATUS", "Trạng thái lớp không hợp lệ.");
        }
        store.offering(id).orElseThrow(() -> missing("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
        if (store.transitionOffering(id, nextStatus, clock.instant()) == 0) {
            throw conflict("COURSE_NOT_ACTIVE", "Chỉ có thể thay đổi lớp đang hoạt động.");
        }
        audit(actor, "COURSE_" + nextStatus, "COURSE_OFFERING", id, traceId);
        return offering(id);
    }

    /** Args: authenticated Student/Teacher, validated report. Output: new OPEN report; side effect insert.
     * Errors: 422 INVALID_FEEDBACK. No report content is written to audit. */
    public AdminModels.Feedback submitFeedback(UUID reporter, AdminModels.FeedbackInput input) {
        if (input == null || !text(input.type(), 30) || !text(input.title(), 200)
                || !text(input.content(), 10_000)) {
            throw new ValidationException("INVALID_FEEDBACK", "Loại, tiêu đề hoặc nội dung phản hồi không hợp lệ.");
        }
        Instant now = clock.instant();
        AdminModels.Feedback report = new AdminModels.Feedback(UUID.randomUUID(), reporter, input.type().strip(),
                input.title().strip(), input.content().strip(), "OPEN", null, now, now);
        store.insertFeedback(report, now);
        return report;
    }

    /** Args: optional status and bounded page/size. Output: feedback page. Errors: INVALID_FILTER/PAGE. */
    @Transactional(readOnly = true)
    public Page<AdminModels.Feedback> feedback(String status, int page, int size) {
        checkPage(page, size);
        checkFilter(status, FEEDBACK_STATUSES);
        return store.feedback(status, page, size);
    }

    /** Args: Admin, report UUID, status/resolution and trace. Output: updated report; side effect audit.
     * Errors: 404 FEEDBACK_NOT_FOUND, 422 INVALID_FEEDBACK_UPDATE. */
    public AdminModels.Feedback updateFeedback(UUID actor, UUID id, AdminModels.FeedbackUpdate input, String traceId) {
        store.feedback(id).orElseThrow(() -> missing("FEEDBACK_NOT_FOUND", "Không tìm thấy phản hồi."));
        if (input == null || input.status() == null || !FEEDBACK_STATUSES.contains(input.status())
                || ("RESOLVED".equals(input.status()) && !text(input.resolution(), 1000))
                || (input.resolution() != null && input.resolution().length() > 1000)) {
            throw new ValidationException("INVALID_FEEDBACK_UPDATE", "Trạng thái hoặc cách xử lý không hợp lệ.");
        }
        store.updateFeedback(id, input.status(), "RESOLVED".equals(input.status())
                ? input.resolution().strip() : null, actor, clock.instant());
        audit(actor, "FEEDBACK_UPDATED", "FEEDBACK_REPORT", id, traceId);
        return store.feedback(id).orElseThrow(() -> missing("FEEDBACK_NOT_FOUND", "Không tìm thấy phản hồi."));
    }

    /** Args: bounded page/size. Output: safe audit page. Errors: INVALID_PAGE. */
    @Transactional(readOnly = true)
    public Page<AdminModels.SystemLog> systemLogs(int page, int size) {
        checkPage(page, size);
        return store.systemLogs(page, size);
    }

    /** Args: none. Output: current enforced runtime settings. Errors: persistence failure. */
    @Transactional(readOnly = true)
    public AdminModels.Settings settings() { return new AdminModels.Settings(store.registrationEnabled()); }

    /** Args: Admin, required registration flag and trace. Output: updated settings; side effect audit.
     * Errors: 422 INVALID_SETTING. */
    public AdminModels.Settings updateSettings(UUID actor, AdminModels.SettingsUpdate input, String traceId) {
        if (input == null || input.registrationEnabled() == null) {
            throw new ValidationException("INVALID_SETTING", "Cần chọn trạng thái cho phép đăng ký.");
        }
        store.setRegistrationEnabled(input.registrationEnabled(), actor, clock.instant());
        audit(actor, "SETTING_UPDATED", "SYSTEM_SETTING", null, traceId);
        return settings();
    }

    /** Args: page/size. Output: void when bounded; errors: INVALID_PAGE. */
    private static void checkPage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ValidationException("INVALID_PAGE", "Trang phải >= 0 và kích thước từ 1 đến 100.");
        }
    }

    /** Args: nullable enum-like filter and allowlist. Output: void; errors: INVALID_FILTER. */
    private static void checkFilter(String value, Set<String> allowed) {
        if (value != null && !allowed.contains(value)) {
            throw new ValidationException("INVALID_FILTER", "Bộ lọc không hợp lệ.");
        }
    }

    /** Args: required or optional text and maximum length. Output: true for nonblank bounded text; errors: none. */
    private static boolean text(String value, int max) {
        return value != null && !value.isBlank() && value.strip().length() <= max;
    }

    /** Args: ID, input, optional old Subject. Output: validated full Subject; errors: INVALID_SUBJECT. */
    private static AdminModels.Subject subjectValue(UUID id, AdminModels.SubjectInput input, AdminModels.Subject old) {
        if (input == null) throw new ValidationException("INVALID_SUBJECT", "Thiếu thông tin môn học.");
        String code = input.code() == null ? old == null ? null : old.code()
                : input.code().strip().toUpperCase(Locale.ROOT);
        String name = input.name() == null ? old == null ? null : old.name() : input.name().strip();
        Integer credits = input.credits() == null ? old == null ? null : old.credits() : input.credits();
        String status = input.status() == null ? old == null ? "ACTIVE" : old.status() : input.status();
        String description = input.description() == null ? old == null ? null : old.description() : input.description();
        if (!text(code, 50) || !text(name, 255) || credits == null || credits < 1 || credits > 30
                || (description != null && description.length() > 10_000)
                || !Set.of("ACTIVE", "INACTIVE").contains(status)) {
            throw new ValidationException("INVALID_SUBJECT", "Thông tin môn học không hợp lệ.");
        }
        return new AdminModels.Subject(id, code, name, credits, description, status);
    }

    /** Args: ID, input, optional old Semester. Output: validated full Semester; errors: INVALID_SEMESTER. */
    private static AdminModels.Semester semesterValue(UUID id, AdminModels.SemesterInput input,
                                                        AdminModels.Semester old) {
        if (input == null) throw new ValidationException("INVALID_SEMESTER", "Thiếu thông tin học kỳ.");
        String code = input.code() == null ? old == null ? null : old.code()
                : input.code().strip().toUpperCase(Locale.ROOT);
        String name = input.name() == null ? old == null ? null : old.name() : input.name().strip();
        String year = input.academicYear() == null ? old == null ? null : old.academicYear()
                : input.academicYear().strip();
        java.time.LocalDate start = input.startDate() == null ? old == null ? null : old.startDate() : input.startDate();
        java.time.LocalDate end = input.endDate() == null ? old == null ? null : old.endDate() : input.endDate();
        String status = input.status() == null ? old == null ? null : old.status() : input.status();
        Boolean enabled = input.offeringCreationEnabled() == null
                ? old == null ? null : old.offeringCreationEnabled() : input.offeringCreationEnabled();
        if (!text(code, 50) || !text(name, 255) || !text(year, 50) || start == null || end == null
                || end.isBefore(start) || status == null || !SEMESTER_STATUSES.contains(status) || enabled == null) {
            throw new ValidationException("INVALID_SEMESTER", "Thông tin học kỳ không hợp lệ.");
        }
        return new AdminModels.Semester(id, code, name, year, start, end, status,
                !"CLOSED".equals(status) && enabled);
    }

    /** Args: actor, allowlisted action/target, optional trace. Output: void; audit in caller transaction. Errors: database failure. */
    private void audit(UUID actor, String action, String targetType, UUID targetId, String traceId) {
        store.audit(actor, action, targetType, targetId, "SUCCESS", traceId, clock.instant());
    }

    /** Args: safe error code/message. Output: 404 exception; errors: none. */
    private static ApiException missing(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    /** Args: safe error code/message. Output: 409 exception; errors: none. */
    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }
}
