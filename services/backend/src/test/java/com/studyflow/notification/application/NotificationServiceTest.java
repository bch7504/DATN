package com.studyflow.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.notification.domain.NotificationType;
import com.studyflow.notification.domain.StudentNotification;
import com.studyflow.study.application.PageResult;
import com.studyflow.study.application.StudyReminderCandidate;
import com.studyflow.study.application.StudyExpiredCandidate;
import com.studyflow.study.application.port.StudyPlanItemStore;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-13T09:00:00Z");
    private static final UUID STUDENT_ID = UUID.fromString("81c138cf-49a3-44dd-8497-ec8684ee79d7");
    private static final UUID TEACHER_ID = UUID.fromString("59db68bd-d2c0-460c-a23c-fb00fa89a5fa");
    private static final UUID ITEM_ID = UUID.fromString("ed787f71-5242-451a-9c1c-c9e979327c39");
    private static final UUID NOTIFICATION_ID = UUID.fromString("2539957f-e515-4ca9-925c-8dc6d8b71f8a");

    @Mock
    private NotificationStore notifications;

    @Mock
    private StudyPlanItemStore studyItems;

    @Mock
    private UserAccountStore users;

    private NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(
                notifications, studyItems, users, Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void generateDueRemindersCreatesOneNotificationAndMarksSourceProcessed() {
        StudyReminderCandidate candidate = new StudyReminderCandidate(
                ITEM_ID, STUDENT_ID, "Ôn tập chương 1", NOW.plusSeconds(3600)
        );
        when(studyItems.findDueReminderCandidates(NOW, 200)).thenReturn(List.of(candidate));
        when(notifications.createDeadlineReminderIfAbsent(
                STUDENT_ID,
                ITEM_ID,
                "Nhiệm vụ sắp đến hạn",
                "Nhiệm vụ “Ôn tập chương 1” sắp đến hạn. Hãy kiểm tra Kế hoạch & Lịch.",
                NOW.plusSeconds(3600),
                NOW
        )).thenReturn(true);

        int inserted = service.generateDueStudyPlanReminders();

        assertThat(inserted).isEqualTo(1);
        verify(studyItems).markReminderSent(ITEM_ID, NOW);
    }

    @Test
    void generateDueRemindersTreatsExistingNotificationAsIdempotentRetry() {
        StudyReminderCandidate candidate = new StudyReminderCandidate(
                ITEM_ID, STUDENT_ID, "Ôn tập chương 1", NOW.plusSeconds(3600)
        );
        when(studyItems.findDueReminderCandidates(NOW, 200)).thenReturn(List.of(candidate));
        when(notifications.createDeadlineReminderIfAbsent(
                any(), any(), any(), any(), any(), any()
        )).thenReturn(false);

        assertThat(service.generateDueStudyPlanReminders()).isZero();
        verify(studyItems).markReminderSent(ITEM_ID, NOW);
    }

    /** Args: none. Input: one on-time and one unfinished expired task. Output: distinct notices; errors: assertions. */
    @Test
    void expiredItemsNotifyTheirStatusAtDeadline() {
        Instant dueAt = NOW.minusSeconds(60);
        UUID unfinishedId = UUID.randomUUID();
        when(studyItems.findExpiredCandidates(NOW, 200)).thenReturn(List.of(
                new StudyExpiredCandidate(ITEM_ID, STUDENT_ID, "Đã ôn", dueAt, dueAt.minusSeconds(60)),
                new StudyExpiredCandidate(unfinishedId, STUDENT_ID, "Chưa ôn", dueAt, null)
        ));
        when(notifications.createEventIfAbsent(any(), any(), any(), any(), any(), any(), any(), any(),
                org.mockito.ArgumentMatchers.eq(true))).thenReturn(true);

        assertThat(service.generateExpiredStudyPlanNotifications()).isEqualTo(2);
        verify(notifications).createEventIfAbsent(STUDENT_ID, NotificationType.STUDY_PLAN_ITEM_EXPIRED,
                "Nhiệm vụ hết hạn · Đã hoàn thành", "Nhiệm vụ “Đã ôn” đã hoàn thành đúng hạn.",
                "STUDY_PLAN_ITEM", ITEM_ID, dueAt, NOW, true);
        verify(notifications).createEventIfAbsent(STUDENT_ID, NotificationType.STUDY_PLAN_ITEM_EXPIRED,
                "Nhiệm vụ hết hạn · Chưa hoàn thành",
                "Nhiệm vụ “Chưa ôn” chưa hoàn thành tại thời điểm hết hạn.",
                "STUDY_PLAN_ITEM", unfinishedId, dueAt, NOW, true);
    }

    @Test
    void markReadIsIdempotentAndOwnerScoped() {
        when(users.findById(STUDENT_ID)).thenReturn(Optional.of(activeStudent()));
        StudentNotification unread = notification(null);
        when(notifications.findOwned(NOTIFICATION_ID, STUDENT_ID)).thenReturn(Optional.of(unread));
        when(notifications.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StudentNotification result = service.markRead(STUDENT_ID, NOTIFICATION_ID);

        assertThat(result.readAt()).isEqualTo(NOW);
        verify(notifications).save(result);
    }

    @Test
    void markReadReturnsOwnerSafeNotFound() {
        when(users.findById(STUDENT_ID)).thenReturn(Optional.of(activeStudent()));
        when(notifications.findOwned(NOTIFICATION_ID, STUDENT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markRead(STUDENT_ID, NOTIFICATION_ID))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status().value()).isEqualTo(404);
                    assertThat(error.code()).isEqualTo("NOTIFICATION_NOT_FOUND");
                });
    }

    @Test
    void teacherCanListOwnNotifications() {
        when(users.findById(TEACHER_ID)).thenReturn(Optional.of(activeTeacher()));
        when(notifications.findOwned(TEACHER_ID, true, 0, 20))
                .thenReturn(new PageResult<>(List.of(), 0, 20, 0, 0));
        assertThat(service.listTeacher(TEACHER_ID, true, 0, 20).items()).isEmpty();
        verify(notifications).findOwned(TEACHER_ID, true, 0, 20);
    }

    @Test
    void teacherCannotMarkAnotherOwnersNotification() {
        when(users.findById(TEACHER_ID)).thenReturn(Optional.of(activeTeacher()));
        when(notifications.findOwned(NOTIFICATION_ID, TEACHER_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.markTeacherRead(TEACHER_ID, NOTIFICATION_ID))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status().value()).isEqualTo(404);
                    assertThat(error.code()).isEqualTo("NOTIFICATION_NOT_FOUND");
                });
    }

    @Test
    void studentCannotUseTeacherNotificationService() {
        when(users.findById(STUDENT_ID)).thenReturn(Optional.of(activeStudent()));
        assertThatThrownBy(() -> service.listTeacher(STUDENT_ID, false, 0, 20))
                .isInstanceOfSatisfying(ApiException.class, error ->
                        assertThat(error.status().value()).isEqualTo(403));
    }

    private static StudentNotification notification(Instant readAt) {
        return new StudentNotification(
                NOTIFICATION_ID, STUDENT_ID, NotificationType.STUDY_PLAN_DEADLINE,
                "Nhiệm vụ sắp đến hạn", "Nội dung nhắc hạn", "STUDY_PLAN_ITEM",
                ITEM_ID, NOW.plusSeconds(3600), readAt, NOW.minusSeconds(60)
        );
    }

    private static UserAccount activeStudent() {
        return new UserAccount(
                STUDENT_ID, "b22dccn002@ptit.edu.vn", "b22dccn002", "password-hash",
                "Sinh viên kiểm thử", "Asia/Ho_Chi_Minh", UserRole.STUDENT, UserStatus.ACTIVE,
                NOW.minusSeconds(1000), NOW.minusSeconds(1000), NOW.minusSeconds(1000)
        );
    }

    private static UserAccount activeTeacher() {
        return new UserAccount(
                TEACHER_ID, "teacher@example.invalid", "teacher", "password-hash",
                "Giảng viên kiểm thử", "Asia/Ho_Chi_Minh", UserRole.TEACHER, UserStatus.ACTIVE,
                NOW.minusSeconds(1000), NOW.minusSeconds(1000), NOW.minusSeconds(1000)
        );
    }
}
