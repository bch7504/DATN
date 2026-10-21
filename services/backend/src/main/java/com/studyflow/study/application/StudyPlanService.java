package com.studyflow.study.application;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.notification.domain.NotificationType;
import com.studyflow.study.application.port.LearningEventStore;
import com.studyflow.study.application.port.StudyPlanItemStore;
import com.studyflow.study.application.port.StudyPlanStore;
import com.studyflow.study.domain.StudyPlan;
import com.studyflow.study.domain.StudyPlanItem;
import com.studyflow.study.domain.StudyPlanItemStatus;
import com.studyflow.study.domain.StudyPlanStatus;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudyPlanService {

    private static final Duration MAX_CALENDAR_WINDOW = Duration.ofDays(31);
    private static final int DEFAULT_REMINDER_MINUTES = 1440;
    private static final int MAX_REMINDER_MINUTES = 10080;

    private final StudyPlanStore plans;
    private final StudyPlanItemStore items;
    private final LearningEventStore learningEvents;
    private final UserAccountStore users;
    private final CourseEnrollmentRepository enrollments;
    private final NotificationStore notifications;
    private final Clock clock;

    /**
     * Creates the study-plan application service.
     *
     * @param plans persistence port for owner-scoped plans
     * @param items persistence port for plan items and calendar projection
     * @param learningEvents idempotent learning-event persistence port
     * @param users account source used to enforce active Student scope and time zone
     * @param enrollments approved Course Offering membership for optional item links
     * @param notifications idempotent in-app and email notification writer
     * @param clock system clock used for timestamps and local activity dates
     */
    public StudyPlanService(
            StudyPlanStore plans,
            StudyPlanItemStore items,
            LearningEventStore learningEvents,
            UserAccountStore users,
            CourseEnrollmentRepository enrollments,
            NotificationStore notifications,
            Clock clock
    ) {
        this.plans = plans;
        this.items = items;
        this.learningEvents = learningEvents;
        this.users = users;
        this.enrollments = enrollments;
        this.notifications = notifications;
        this.clock = clock;
    }

    /**
     * Creates an active personal plan for the authenticated Student.
     *
     * @param studentId authenticated Student identifier
     * @param command required title and inclusive date range, with optional description
     * @return persisted active plan owned by the Student
     * @throws ApiException with 403 for an unavailable account or 422 for invalid content/range
     */
    @Transactional
    public StudyPlan createPlan(UUID studentId, CreateStudyPlanCommand command) {
        requireActiveStudent(studentId);
        String title = normalizeRequired(command.title(), 150, "INVALID_STUDY_PLAN_TITLE", "Tên kế hoạch");
        String description = normalizeOptional(command.description(), 1000, "Mô tả kế hoạch");
        validatePlanRange(command.startDate(), command.endDate());
        Instant now = clock.instant();
        return plans.save(StudyPlan.create(
                studentId, title, description, command.startDate(), command.endDate(), now
        ));
    }

    /**
     * Lists only plans owned by the authenticated Student.
     *
     * @param studentId authenticated Student identifier
     * @param status optional lifecycle filter; null means all states
     * @param page zero-based page index
     * @param size page size from 1 to 100, validated by the HTTP boundary
     * @return page of plans ordered by start date and creation time descending
     * @throws ApiException with 403 when the account is unavailable
     */
    @Transactional(readOnly = true)
    public PageResult<StudyPlan> listPlans(UUID studentId, StudyPlanStatus status, int page, int size) {
        requireActiveStudent(studentId);
        return plans.findAllOwned(studentId, status, page, size);
    }

    /**
     * Gets one owner-scoped plan without disclosing plans belonging to another user.
     *
     * @param studentId authenticated Student identifier
     * @param planId required plan identifier
     * @return owned plan
     * @throws ApiException with 403 for an unavailable account or 404 when not owned/found
     */
    @Transactional(readOnly = true)
    public StudyPlan getPlan(UUID studentId, UUID planId) {
        requireActiveStudent(studentId);
        return requireOwnedPlan(planId, studentId);
    }

    /**
     * Replaces editable fields of an owner-scoped plan.
     *
     * @param studentId authenticated Student identifier
     * @param planId required owner-scoped plan identifier
     * @param command complete replacement fields and lifecycle state
     * @return persisted updated plan
     * @throws ApiException with 404 when absent or 422 when range/content excludes existing items
     */
    @Transactional
    public StudyPlan updatePlan(UUID studentId, UUID planId, UpdateStudyPlanCommand command) {
        UserAccount student = requireActiveStudent(studentId);
        StudyPlan current = requireOwnedPlan(planId, studentId);
        String title = normalizeRequired(command.title(), 150, "INVALID_STUDY_PLAN_TITLE", "Tên kế hoạch");
        String description = normalizeOptional(command.description(), 1000, "Mô tả kế hoạch");
        validatePlanRange(command.startDate(), command.endDate());
        if (command.status() == null) {
            throw invalidPlanRange("Trạng thái kế hoạch là bắt buộc");
        }
        ZoneId zoneId = ZoneId.of(student.timeZone());
        for (StudyPlanItem item : items.findAllOwnedUnpaged(planId, studentId)) {
            if (item.status() != StudyPlanItemStatus.CANCELLED && item.status() != StudyPlanItemStatus.DELETED) {
                validateItemInsideRange(item, command.startDate(), command.endDate(), zoneId);
            }
        }
        return plans.save(current.update(
                title, description, command.startDate(), command.endDate(), command.status(), clock.instant()
        ));
    }

    /**
     * Soft-deletes an owner-scoped plan by setting it to ARCHIVED.
     *
     * @param studentId authenticated Student identifier
     * @param planId required plan identifier
     * @throws ApiException with 404 when the plan is absent/not owned
     * Side effect: persists ARCHIVED once; repeated calls are safe.
     */
    @Transactional
    public void archivePlan(UUID studentId, UUID planId) {
        requireActiveStudent(studentId);
        StudyPlan plan = requireOwnedPlan(planId, studentId);
        if (plan.status() != StudyPlanStatus.ARCHIVED) {
            plans.save(plan.archive(clock.instant()));
        }
    }

    /**
     * Creates a task or scheduled block inside an owner-scoped personal plan.
     *
     * @param studentId authenticated Student identifier
     * @param planId required active/non-archived plan identifier
     * @param command complete item content, type, optional schedule, deadline and approved class link
     * @return persisted TODO item; also creates one owner notification and queues eligible email
     * @throws ApiException with 403 for unapproved class link, 404 absent plan, 409 archive/conflict or 422 invalid time
     */
    @Transactional
    public StudyPlanItem createItem(UUID studentId, UUID planId, SaveStudyPlanItemCommand command) {
        UserAccount student = requireActiveStudent(studentId);
        StudyPlan plan = requireMutablePlan(planId, studentId);
        ValidatedItem validated = validateItem(command, plan, ZoneId.of(student.timeZone()), null);
        requireApprovedCourseLink(studentId, command.courseOfferingId());
        Instant now = clock.instant();
        StudyPlanItem created = items.save(StudyPlanItem.create(
                planId, validated.title(), validated.description(), command.type(),
                command.scheduledStart(), command.scheduledEnd(), command.dueAt(),
                validated.reminderAt(), now, command.courseOfferingId()
        ));
        notifications.createEventIfAbsent(studentId, NotificationType.STUDY_PLAN_ITEM_CREATED,
                "Đã tạo nhiệm vụ", "Nhiệm vụ “" + created.title() + "” đã được thêm vào Kế hoạch & Lịch.",
                "STUDY_PLAN_ITEM", created.id(), created.dueAt(), now, true);
        return created;
    }

    /**
     * Lists every item in a plan owned by the authenticated Student.
     *
     * @param studentId authenticated Student identifier
     * @param planId owner-scoped plan identifier
     * @param page zero-based page index
     * @param size page size from 1 to 100, validated by the HTTP boundary
     * @return page of ordered items including completed and cancelled, excluding hidden DELETED records
     * @throws ApiException with 404 when plan is absent/not owned
     */
    @Transactional(readOnly = true)
    public PageResult<StudyPlanItem> listItems(UUID studentId, UUID planId, int page, int size) {
        requireActiveStudent(studentId);
        requireOwnedPlan(planId, studentId);
        return items.findAllOwned(planId, studentId, page, size);
    }

    /**
     * Replaces item content and time fields without changing its completion status.
     *
     * @param studentId authenticated Student identifier
     * @param planId owner-scoped plan identifier
     * @param itemId owner-scoped item identifier
     * @param command complete replacement item data, including optional approved class link
     * @return persisted updated item
     * @throws ApiException with 403 for unapproved class link, 404 absent/deleted item,
     *         409 archive/cancel/conflict/late-completed lock or 422 invalid input
     */
    @Transactional
    public StudyPlanItem updateItem(
            UUID studentId,
            UUID planId,
            UUID itemId,
            SaveStudyPlanItemCommand command
    ) {
        UserAccount student = requireActiveStudent(studentId);
        StudyPlan plan = requireMutablePlan(planId, studentId);
        StudyPlanItem current = requireOwnedItemForUpdate(itemId, planId, studentId);
        if (current.status() == StudyPlanItemStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "STUDY_PLAN_ITEM_CANCELLED", "Nhiệm vụ đã bị hủy");
        }
        if (current.status() == StudyPlanItemStatus.DELETED) throw itemNotFound();
        if (isLateCompleted(current)) throw lateCompletedLocked();
        ValidatedItem validated = validateItem(command, plan, ZoneId.of(student.timeZone()), current);
        requireApprovedCourseLink(studentId, command.courseOfferingId());
        return items.save(current.updateDetails(
                validated.title(), validated.description(), command.type(),
                command.scheduledStart(), command.scheduledEnd(), command.dueAt(),
                validated.reminderAt(), clock.instant(), command.courseOfferingId()
        ));
    }

    /**
     * Soft-deletes an item by setting it to CANCELLED.
     *
     * @param studentId authenticated Student identifier
     * @param planId owner-scoped plan identifier
     * @param itemId owner-scoped item identifier
     * @throws ApiException with 404 when plan/item is absent or 409 when archived/late-completed
     * Side effect: persists CANCELLED once; repeated calls are safe.
     */
    @Transactional
    public void cancelItem(UUID studentId, UUID planId, UUID itemId) {
        requireActiveStudent(studentId);
        requireMutablePlan(planId, studentId);
        StudyPlanItem item = requireOwnedItemForUpdate(itemId, planId, studentId);
        if (item.status() == StudyPlanItemStatus.DELETED) throw itemNotFound();
        if (isLateCompleted(item)) throw lateCompletedLocked();
        if (item.status() != StudyPlanItemStatus.CANCELLED) {
            items.save(item.cancel(clock.instant()));
        }
    }

    /**
     * Hides one owned item while preserving its record, completion time and learning event.
     * Args: authenticated studentId, owner planId and itemId. Input: mutable owned plan and item.
     * Output: void, idempotent DELETED transition. Errors: 404 missing/not owned, 409 archived plan.
     */
    @Transactional
    public void deleteItem(UUID studentId, UUID planId, UUID itemId) {
        requireActiveStudent(studentId);
        requireMutablePlan(planId, studentId);
        StudyPlanItem item = requireOwnedItemForUpdate(itemId, planId, studentId);
        if (item.status() != StudyPlanItemStatus.DELETED) {
            items.save(item.delete(clock.instant()));
        }
    }

    /**
     * Permanently deletes an owned item and all derived history tied to that item.
     * Args: authenticated studentId, owner planId and itemId. Input: active owner-scoped plan/item.
     * Output: void; removes the plan row, its completion learning event and its in-app notifications.
     * Errors: 403 unavailable Student, 404 missing/not-owned plan or item in another plan owned by Student,
     * 409 archived plan when the item exists. A missing or foreign-owned item is a privacy-safe no-op (204).
     * Linked notification email-outbox rows are removed in the same
     * transaction; already delivered email cannot be recalled. Derived dashboard metrics may change because
     * the completion event is removed.
     */
    @Transactional
    public void permanentlyDeleteItem(UUID studentId, UUID planId, UUID itemId) {
        requireActiveStudent(studentId);
        StudyPlan plan = requireOwnedPlan(planId, studentId);
        StudyPlanItem item = items.findOwnedForUpdate(itemId, studentId).orElse(null);
        if (item == null) return;
        if (!item.planId().equals(planId)) throw itemNotFound();
        if (plan.status() == StudyPlanStatus.ARCHIVED) {
            throw new ApiException(HttpStatus.CONFLICT, "STUDY_PLAN_ARCHIVED", "Kế hoạch đã được lưu trữ");
        }

        notifications.deleteStudyPlanItemNotifications(studentId, itemId);
        learningEvents.deleteStudyTaskCompletionEvents(studentId, itemId);
        items.delete(item);
    }

    /**
     * Changes TODO/completed state and emits a single idempotent completion event.
     *
     * @param studentId authenticated Student identifier
     * @param itemId owner-scoped item identifier locked for the transition
     * @param status requested TODO or COMPLETED state
     * @param idempotencyKey required 8..100 character key only for a new transition to COMPLETED
     * @return persisted item, or the current item for an identical repeated state; late completion
     *         also creates one owner notification and queues eligible email
     * @throws ApiException with 404 when absent/deleted, 409 when cancelled/archived/late-completed,
     *         or 422 for invalid state/key
     */
    @Transactional
    public StudyPlanItem changeItemStatus(
            UUID studentId,
            UUID itemId,
            StudyPlanItemStatus status,
            String idempotencyKey
    ) {
        UserAccount student = requireActiveStudent(studentId);
        StudyPlanItem current = items.findOwnedForUpdate(itemId, studentId)
                .orElseThrow(StudyPlanService::itemNotFound);
        requireMutablePlan(current.planId(), studentId);
        if (current.status() == StudyPlanItemStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "STUDY_PLAN_ITEM_CANCELLED", "Nhiệm vụ đã bị hủy");
        }
        if (current.status() == StudyPlanItemStatus.DELETED) throw itemNotFound();
        if (status == null || status == StudyPlanItemStatus.CANCELLED || status == StudyPlanItemStatus.DELETED) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "INVALID_STUDY_PLAN_ITEM_STATUS",
                    "Chỉ có thể chuyển nhiệm vụ sang TODO hoặc COMPLETED"
            );
        }
        if (current.status() == status) {
            return current;
        }
        if (isLateCompleted(current)) throw lateCompletedLocked();
        if (status == StudyPlanItemStatus.COMPLETED && !validIdempotencyKey(idempotencyKey)) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "IDEMPOTENCY_KEY_REQUIRED",
                    "Cần Idempotency-Key từ 8 đến 100 ký tự khi hoàn thành nhiệm vụ"
            );
        }

        Instant now = clock.instant();
        StudyPlanItem updated = items.save(current.changeStatus(status, now));
        if (status == StudyPlanItemStatus.COMPLETED) {
            LocalDate activityDate = now.atZone(ZoneId.of(student.timeZone())).toLocalDate();
            learningEvents.recordStudyTaskCompleted(
                    studentId, current.id(), idempotencyKey.strip(), now, activityDate
            );
            if (current.dueAt() != null && now.isAfter(current.dueAt())) {
                notifications.createEventIfAbsent(studentId, NotificationType.STUDY_PLAN_ITEM_LATE_COMPLETED,
                        "Nhiệm vụ hoàn thành muộn",
                        "Nhiệm vụ “" + current.title() + "” đã hoàn thành sau hạn và không thể sửa; bạn vẫn có thể xóa vĩnh viễn nhiệm vụ và lịch sử liên quan.",
                        "STUDY_PLAN_ITEM", current.id(), current.dueAt(), now, true);
            }
        }
        return updated;
    }

    /** Args: persisted item. Input: completion/deadline timestamps. Output: true only for late completion; errors: none. */
    private static boolean isLateCompleted(StudyPlanItem item) {
        return item.status() == StudyPlanItemStatus.COMPLETED && item.dueAt() != null
                && item.completedAt() != null && item.completedAt().isAfter(item.dueAt());
    }

    /** Args: none. Input: attempted edit of a late-completed item. Output: 409 API error; errors: always throws. */
    private static ApiException lateCompletedLocked() {
        return new ApiException(HttpStatus.CONFLICT, "STUDY_PLAN_ITEM_LATE_COMPLETED_LOCKED",
                "Nhiệm vụ đã hoàn thành muộn; chỉ có thể xóa khỏi lịch");
    }

    /**
     * Returns the authenticated Student's calendar projection for a bounded UTC window.
     *
     * @param studentId authenticated Student identifier
     * @param from inclusive UTC start instant
     * @param to exclusive UTC end instant, at most 31 days after from
     * @return items whose schedule overlaps the window or whose deadline lies inside it
     * @throws ApiException with 422 when the time window is invalid
     */
    @Transactional(readOnly = true)
    public List<StudyPlanItem> calendar(UUID studentId, Instant from, Instant to) {
        requireActiveStudent(studentId);
        if (from == null || to == null || !from.isBefore(to)
                || Duration.between(from, to).compareTo(MAX_CALENDAR_WINDOW) > 0) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "INVALID_CALENDAR_RANGE",
                    "Khoảng lịch phải tăng dần và không vượt quá 31 ngày"
            );
        }
        return items.findCalendarItems(studentId, from, to);
    }

    private UserAccount requireActiveStudent(UUID studentId) {
        return users.findById(studentId)
                .filter(account -> account.status() == UserStatus.ACTIVE)
                .filter(account -> account.role() == UserRole.STUDENT)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.FORBIDDEN,
                        "ACCOUNT_UNAVAILABLE",
                        "Tài khoản Student không tồn tại hoặc không khả dụng"
                ));
    }

    private StudyPlan requireOwnedPlan(UUID planId, UUID studentId) {
        return plans.findOwned(planId, studentId).orElseThrow(StudyPlanService::planNotFound);
    }

    private StudyPlan requireMutablePlan(UUID planId, UUID studentId) {
        StudyPlan plan = requireOwnedPlan(planId, studentId);
        if (plan.status() == StudyPlanStatus.ARCHIVED) {
            throw new ApiException(HttpStatus.CONFLICT, "STUDY_PLAN_ARCHIVED", "Kế hoạch đã được lưu trữ");
        }
        return plan;
    }

    /** Args: owner item/plan/student IDs. Input: current write transaction. Output: locked owned item; errors: 404 otherwise. */
    private StudyPlanItem requireOwnedItemForUpdate(UUID itemId, UUID planId, UUID studentId) {
        return items.findOwnedForUpdate(itemId, studentId)
                .filter(candidate -> candidate.planId().equals(planId))
                .orElseThrow(StudyPlanService::itemNotFound);
    }

    /**
     * Args: authenticated studentId and optional courseOfferingId. Input: current enrollment record.
     * Output: void when unlinked or APPROVED. Errors: 403 when the Student is not approved in that class.
     */
    private void requireApprovedCourseLink(UUID studentId, UUID courseOfferingId) {
        if (courseOfferingId == null) return;
        boolean approved = enrollments.findByCourseOfferingIdAndStudentId(courseOfferingId, studentId)
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.APPROVED)
                .isPresent();
        if (!approved) {
            throw new ApiException(HttpStatus.FORBIDDEN, "COURSE_ENROLLMENT_REQUIRED",
                    "Chỉ được gắn đầu việc với lớp học phần đã được duyệt");
        }
    }

    /**
     * Args: replacement command, owned plan, Student zone and optional current item (null for create).
     * Input: validated owner scope and current database schedule. Output: normalized content/reminder.
     * Errors: 422 invalid fields/time/range or 409 schedule overlap. An unchanged past deadline
     * keeps its old reminder so on-time completed or overdue items remain editable.
     */
    private ValidatedItem validateItem(
            SaveStudyPlanItemCommand command,
            StudyPlan plan,
            ZoneId zoneId,
            StudyPlanItem current
    ) {
        String title = normalizeRequired(
                command.title(), 200, "INVALID_STUDY_PLAN_ITEM_TITLE", "Tên nhiệm vụ"
        );
        String description = normalizeOptional(command.description(), 1000, "Mô tả nhiệm vụ");
        if (command.type() == null) {
            throw invalidItemTime("Loại nhiệm vụ là bắt buộc");
        }
        boolean hasStart = command.scheduledStart() != null;
        boolean hasEnd = command.scheduledEnd() != null;
        if (hasStart != hasEnd) {
            throw invalidItemTime("Thời gian bắt đầu và kết thúc phải được cung cấp cùng nhau");
        }
        if (!hasStart && command.dueAt() == null) {
            throw invalidItemTime("Nhiệm vụ phải có lịch học hoặc hạn hoàn thành");
        }
        if (hasStart && !command.scheduledStart().isBefore(command.scheduledEnd())) {
            throw invalidItemTime("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        Instant reminderAt = current != null && command.dueAt() != null
                && command.dueAt().equals(current.dueAt()) && !command.dueAt().isAfter(clock.instant())
                ? current.reminderAt()
                : resolveReminderAt(command.dueAt(), command.reminderMinutesBefore(), clock.instant());
        StudyPlanItem candidate = StudyPlanItem.create(
                plan.id(), title, description, command.type(), command.scheduledStart(),
                command.scheduledEnd(), command.dueAt(), reminderAt, clock.instant(), command.courseOfferingId()
        );
        validateItemInsideRange(candidate, plan.startDate(), plan.endDate(), zoneId);
        if (hasStart && items.hasScheduleConflict(
                plan.studentId(), command.scheduledStart(), command.scheduledEnd(), current == null ? null : current.id()
        )) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "STUDY_SCHEDULE_CONFLICT",
                    "Khung giờ này trùng với lịch học cá nhân khác"
            );
        }
        return new ValidatedItem(title, description, reminderAt);
    }

    private static void validateItemInsideRange(
            StudyPlanItem item,
            LocalDate startDate,
            LocalDate endDate,
            ZoneId zoneId
    ) {
        if (item.scheduledStart() != null) {
            requireDateInRange(item.scheduledStart(), startDate, endDate, zoneId);
            requireDateInRange(item.scheduledEnd(), startDate, endDate, zoneId);
        }
        if (item.dueAt() != null) {
            requireDateInRange(item.dueAt(), startDate, endDate, zoneId);
        }
    }

    private static void requireDateInRange(
            Instant value,
            LocalDate startDate,
            LocalDate endDate,
            ZoneId zoneId
    ) {
        LocalDate localDate = value.atZone(zoneId).toLocalDate();
        if (localDate.isBefore(startDate) || localDate.isAfter(endDate)) {
            throw invalidItemTime("Lịch và hạn hoàn thành phải nằm trong khoảng ngày của kế hoạch");
        }
    }

    private static void validatePlanRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            throw invalidPlanRange("Ngày kết thúc không được trước ngày bắt đầu");
        }
    }

    private static String normalizeRequired(
            String raw,
            int maxLength,
            String code,
            String fieldName
    ) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, code, fieldName + " không được để trống");
        }
        String value = raw.strip();
        if (value.length() > maxLength) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    code,
                    fieldName + " không được vượt quá " + maxLength + " ký tự"
            );
        }
        return value;
    }

    private static String normalizeOptional(String raw, int maxLength, String fieldName) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.strip();
        if (value.length() > maxLength) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "INVALID_DESCRIPTION",
                    fieldName + " không được vượt quá " + maxLength + " ký tự"
            );
        }
        return value;
    }

    private static boolean validIdempotencyKey(String value) {
        return value != null && value.strip().length() >= 8 && value.strip().length() <= 100;
    }

    private static Instant resolveReminderAt(Instant dueAt, Integer requestedMinutes, Instant now) {
        if (dueAt == null) {
            if (requestedMinutes != null) {
                throw invalidReminder("Chỉ được đặt nhắc hạn khi nhiệm vụ có deadline");
            }
            return null;
        }
        if (!dueAt.isAfter(now)) {
            throw invalidReminder("Deadline mới phải ở tương lai");
        }
        int minutes = requestedMinutes == null ? DEFAULT_REMINDER_MINUTES : requestedMinutes;
        if (minutes < 0 || minutes > MAX_REMINDER_MINUTES) {
            throw invalidReminder("Thời gian nhắc phải từ 0 đến 10080 phút trước deadline");
        }
        Instant requestedReminder = dueAt.minus(Duration.ofMinutes(minutes));
        return requestedReminder.isBefore(now) ? now : requestedReminder;
    }

    private static ApiException planNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "STUDY_PLAN_NOT_FOUND", "Không tìm thấy kế hoạch");
    }

    private static ApiException itemNotFound() {
        return new ApiException(
                HttpStatus.NOT_FOUND,
                "STUDY_PLAN_ITEM_NOT_FOUND",
                "Không tìm thấy nhiệm vụ học tập"
        );
    }

    private static ApiException invalidPlanRange(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_STUDY_PLAN_RANGE", message);
    }

    private static ApiException invalidItemTime(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_STUDY_PLAN_ITEM_TIME", message);
    }

    private static ApiException invalidReminder(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_REMINDER", message);
    }

    private record ValidatedItem(String title, String description, Instant reminderAt) {
    }
}
