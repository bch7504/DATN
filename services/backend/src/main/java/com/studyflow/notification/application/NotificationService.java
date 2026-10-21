package com.studyflow.notification.application;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.notification.domain.StudentNotification;
import com.studyflow.notification.domain.NotificationType;
import com.studyflow.study.application.PageResult;
import com.studyflow.study.application.StudyExpiredCandidate;
import com.studyflow.study.application.StudyReminderCandidate;
import com.studyflow.study.application.port.StudyPlanItemStore;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private static final int REMINDER_BATCH_SIZE = 200;

    private final NotificationStore notifications;
    private final StudyPlanItemStore studyItems;
    private final UserAccountStore users;
    private final Clock clock;

    /**
     * Creates the notification application service.
     *
     * @param notifications owner-scoped notification persistence port
     * @param studyItems source of due study reminders and reminder delivery state
     * @param users account source used to enforce active Student scope
     * @param clock system clock for deterministic creation/read timestamps
     */
    public NotificationService(
            NotificationStore notifications,
            StudyPlanItemStore studyItems,
            UserAccountStore users,
            Clock clock
    ) {
        this.notifications = notifications;
        this.studyItems = studyItems;
        this.users = users;
        this.clock = clock;
    }

    /**
     * Lists notifications owned by the authenticated active Student.
     *
     * @param studentId authenticated Student identifier
     * @param unreadOnly true to include only unread notifications
     * @param page zero-based page index
     * @param size page size from 1 to 100
     * @return owner-scoped notification page ordered newest first
     * @throws ApiException with 403 when the account is unavailable
     */
    @Transactional(readOnly = true)
    public PageResult<StudentNotification> list(
            UUID studentId,
            boolean unreadOnly,
            int page,
            int size
    ) {
        requireActiveStudent(studentId);
        return notifications.findOwned(studentId, unreadOnly, page, size);
    }

    /**
     * Args: active teacher ID, unreadOnly filter, zero-based page and size 1..100.
     * Input: authenticated teacher account. Output: owner-scoped notification page.
     * Errors: 403 ACCOUNT_UNAVAILABLE for another role/inactive account.
     */
    @Transactional(readOnly = true)
    public PageResult<StudentNotification> listTeacher(UUID teacherId, boolean unreadOnly, int page, int size) {
        requireActiveTeacher(teacherId);
        return notifications.findOwned(teacherId, unreadOnly, page, size);
    }

    /**
     * Marks one owner-scoped notification as read idempotently.
     *
     * @param studentId authenticated Student identifier
     * @param notificationId required owner-scoped notification identifier
     * @return persisted notification containing readAt
     * @throws ApiException with 403 for unavailable account or 404 when absent/not owned
     */
    @Transactional
    public StudentNotification markRead(UUID studentId, UUID notificationId) {
        requireActiveStudent(studentId);
        return markOwnedRead(studentId, notificationId);
    }

    /**
     * Args: active teacher ID and required notification ID. Input: authenticated teacher account.
     * Output: owner-scoped notification with readAt set once. Errors: 403 unavailable, 404 not owned.
     */
    @Transactional
    public StudentNotification markTeacherRead(UUID teacherId, UUID notificationId) {
        requireActiveTeacher(teacherId);
        return markOwnedRead(teacherId, notificationId);
    }

    /** Args: validated owner and notification IDs. Input: owner-scoped store. Output: read notification; errors: 404 when absent/not owned. */
    private StudentNotification markOwnedRead(UUID ownerId, UUID notificationId) {
        StudentNotification current = notifications.findOwned(notificationId, ownerId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "NOTIFICATION_NOT_FOUND",
                        "Không tìm thấy thông báo"
                ));
        return current.readAt() == null
                ? notifications.save(current.markRead(clock.instant()))
                : current;
    }

    /**
     * Generates in-app reminders for due TODO items in an idempotent bounded batch.
     *
     * @return number of new notifications inserted in this run, from 0 to 200
     * Side effects: inserts at most one STUDY_PLAN_DEADLINE notification per item and marks
     * the source reminder as processed. Safe to retry after process restarts.
     */
    @Transactional
    public int generateDueStudyPlanReminders() {
        Instant now = clock.instant();
        int inserted = 0;
        for (StudyReminderCandidate candidate : studyItems.findDueReminderCandidates(
                now, REMINDER_BATCH_SIZE
        )) {
            boolean created = notifications.createDeadlineReminderIfAbsent(
                    candidate.studentId(),
                    candidate.itemId(),
                    "Nhiệm vụ sắp đến hạn",
                    "Nhiệm vụ “" + candidate.itemTitle() + "” sắp đến hạn. Hãy kiểm tra Kế hoạch & Lịch.",
                    candidate.dueAt(),
                    now
            );
            studyItems.markReminderSent(candidate.itemId(), now);
            if (created) {
                inserted++;
            }
        }
        return inserted;
    }

    /**
     * Args: none. Input: at most 200 active study items whose deadline has passed and whose expiry
     * event has not been stored. Output: number of newly inserted notices, from 0 to 200.
     * Errors: database errors roll back the batch and the next scan retries. Each notice states
     * whether the item was completed by its deadline; unique owner/type/source prevents duplicates.
     */
    @Transactional
    public int generateExpiredStudyPlanNotifications() {
        Instant now = clock.instant();
        int inserted = 0;
        for (StudyExpiredCandidate candidate : studyItems.findExpiredCandidates(now, REMINDER_BATCH_SIZE)) {
            boolean completedOnTime = candidate.completedAt() != null
                    && !candidate.completedAt().isAfter(candidate.dueAt());
            String title = completedOnTime ? "Nhiệm vụ hết hạn · Đã hoàn thành" : "Nhiệm vụ hết hạn · Chưa hoàn thành";
            String message = completedOnTime
                    ? "Nhiệm vụ “" + candidate.itemTitle() + "” đã hoàn thành đúng hạn."
                    : "Nhiệm vụ “" + candidate.itemTitle() + "” chưa hoàn thành tại thời điểm hết hạn.";
            if (notifications.createEventIfAbsent(candidate.studentId(), NotificationType.STUDY_PLAN_ITEM_EXPIRED,
                    title, message, "STUDY_PLAN_ITEM", candidate.itemId(), candidate.dueAt(), now, true)) {
                inserted++;
            }
        }
        return inserted;
    }

    private void requireActiveStudent(UUID studentId) {
        users.findById(studentId)
                .filter(account -> account.status() == UserStatus.ACTIVE)
                .filter(account -> account.role() == UserRole.STUDENT)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.FORBIDDEN,
                        "ACCOUNT_UNAVAILABLE",
                        "Tài khoản Student không tồn tại hoặc không khả dụng"
                ));
    }

    /** Args: authenticated teacher ID. Input: account store. Output: void; errors: 403 when inactive/wrong role. */
    private void requireActiveTeacher(UUID teacherId) {
        users.findById(teacherId)
                .filter(account -> account.status() == UserStatus.ACTIVE)
                .filter(account -> account.role() == UserRole.TEACHER)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.FORBIDDEN, "ACCOUNT_UNAVAILABLE", "Tài khoản Teacher không khả dụng"
                ));
    }
}
