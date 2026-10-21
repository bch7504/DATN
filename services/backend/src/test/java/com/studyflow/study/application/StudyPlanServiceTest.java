package com.studyflow.study.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.notification.domain.NotificationType;
import com.studyflow.study.application.port.LearningEventStore;
import com.studyflow.study.application.port.StudyPlanItemStore;
import com.studyflow.study.application.port.StudyPlanStore;
import com.studyflow.study.domain.StudyPlan;
import com.studyflow.study.domain.StudyPlanItem;
import com.studyflow.study.domain.StudyPlanItemStatus;
import com.studyflow.study.domain.StudyPlanItemType;
import com.studyflow.study.domain.StudyPlanStatus;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StudyPlanServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-13T09:00:00Z");
    private static final UUID STUDENT_ID = UUID.fromString("81c138cf-49a3-44dd-8497-ec8684ee79d7");
    private static final UUID PLAN_ID = UUID.fromString("6726d698-a9de-4145-a43e-c7e5a15bb8f4");
    private static final UUID ITEM_ID = UUID.fromString("ed787f71-5242-451a-9c1c-c9e979327c39");
    private static final UUID COURSE_ID = UUID.fromString("a4306c28-f41e-4bcd-ae47-fd55e14f27cd");

    @Mock
    private StudyPlanStore plans;

    @Mock
    private StudyPlanItemStore items;

    @Mock
    private LearningEventStore learningEvents;

    @Mock
    private UserAccountStore users;

    @Mock
    private CourseEnrollmentRepository enrollments;

    @Mock
    private NotificationStore notifications;

    private StudyPlanService service;
    private StudyPlan plan;

    @BeforeEach
    void setUp() {
        service = new StudyPlanService(
                plans, items, learningEvents, users, enrollments, notifications, Clock.fixed(NOW, ZoneOffset.UTC)
        );
        plan = new StudyPlan(
                PLAN_ID, STUDENT_ID, "Ôn thi học kỳ", null,
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                StudyPlanStatus.ACTIVE, NOW.minusSeconds(100), NOW.minusSeconds(100)
        );
        when(users.findById(STUDENT_ID)).thenReturn(Optional.of(activeStudent()));
    }

    @Test
    void createPlanNormalizesAndPersistsAnActiveOwnedPlan() {
        when(plans.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StudyPlan result = service.createPlan(
                STUDENT_ID,
                new CreateStudyPlanCommand(
                        "  Ôn thi cuối kỳ  ", "  Kế hoạch cá nhân  ",
                        LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31)
                )
        );

        assertThat(result.studentId()).isEqualTo(STUDENT_ID);
        assertThat(result.title()).isEqualTo("Ôn thi cuối kỳ");
        assertThat(result.description()).isEqualTo("Kế hoạch cá nhân");
        assertThat(result.status()).isEqualTo(StudyPlanStatus.ACTIVE);
    }

    @Test
    void createPlanRejectsAnInvalidDateRange() {
        assertThatThrownBy(() -> service.createPlan(
                STUDENT_ID,
                new CreateStudyPlanCommand(
                        "Ôn thi", null,
                        LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 1)
                )
        )).isInstanceOfSatisfying(ApiException.class, error -> {
            assertThat(error.status().value()).isEqualTo(422);
            assertThat(error.code()).isEqualTo("INVALID_STUDY_PLAN_RANGE");
        });
        verify(plans, never()).save(any());
    }

    @Test
    void createItemRejectsAnOverlappingSchedule() {
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        when(items.hasScheduleConflict(eq(STUDENT_ID), any(), any(), eq(null))).thenReturn(true);

        SaveStudyPlanItemCommand command = new SaveStudyPlanItemCommand(
                "Đọc tài liệu", null, StudyPlanItemType.STUDY_SESSION,
                Instant.parse("2026-10-14T01:00:00Z"),
                Instant.parse("2026-10-14T02:00:00Z"),
                null,
                null
        );

        assertThatThrownBy(() -> service.createItem(STUDENT_ID, PLAN_ID, command))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status().value()).isEqualTo(409);
                    assertThat(error.code()).isEqualTo("STUDY_SCHEDULE_CONFLICT");
                });
        verifyNoInteractions(notifications);
    }

    @Test
    void createDeadlineItemDefaultsReminderToTwentyFourHoursBeforeDueTime() {
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        when(items.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        Instant dueAt = Instant.parse("2026-10-15T12:00:00Z");

        StudyPlanItem result = service.createItem(
                STUDENT_ID,
                PLAN_ID,
                new SaveStudyPlanItemCommand(
                        "Làm đề ôn tập", null, StudyPlanItemType.TASK,
                        null, null, dueAt, null
                )
        );

        assertThat(result.dueAt()).isEqualTo(dueAt);
        assertThat(result.reminderAt()).isEqualTo(Instant.parse("2026-10-14T12:00:00Z"));
        assertThat(result.reminderSentAt()).isNull();
        verify(notifications).createEventIfAbsent(eq(STUDENT_ID), eq(NotificationType.STUDY_PLAN_ITEM_CREATED),
                any(), any(), eq("STUDY_PLAN_ITEM"), eq(result.id()), eq(dueAt), eq(NOW), eq(true));
    }

    /** Args: none. Input: approved synthetic enrollment. Output: saved class-linked item; errors: assertions. */
    @Test
    void createsItemLinkedToApprovedCourseOffering() {
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        CourseEnrollment enrollment = new CourseEnrollment(UUID.randomUUID(), COURSE_ID, STUDENT_ID);
        enrollment.setStatus(EnrollmentStatus.APPROVED);
        when(enrollments.findByCourseOfferingIdAndStudentId(COURSE_ID, STUDENT_ID))
                .thenReturn(Optional.of(enrollment));
        when(items.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StudyPlanItem result = service.createItem(STUDENT_ID, PLAN_ID, new SaveStudyPlanItemCommand(
                "Ôn chương 1", null, StudyPlanItemType.TASK, null, null,
                NOW.plusSeconds(7200), null, COURSE_ID));

        assertThat(result.courseOfferingId()).isEqualTo(COURSE_ID);
        assertThat(result.status()).isEqualTo(StudyPlanItemStatus.TODO);
    }

    /** Args: none. Input: Student without approved class enrollment. Output: no linked item; errors: 403. */
    @Test
    void rejectsClassLinkWithoutApprovedEnrollment() {
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        when(enrollments.findByCourseOfferingIdAndStudentId(COURSE_ID, STUDENT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createItem(STUDENT_ID, PLAN_ID, new SaveStudyPlanItemCommand(
                "Ôn chương 1", null, StudyPlanItemType.TASK, null, null,
                NOW.plusSeconds(7200), null, COURSE_ID)))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status().value()).isEqualTo(403);
                    assertThat(error.code()).isEqualTo("COURSE_ENROLLMENT_REQUIRED");
                });
        verify(items, never()).save(any());
    }

    /** Args: none. Input: approved enrollment and existing personal item. Output: same item ID linked to class. */
    @Test
    void updateItemCanLinkAnExistingPersonalTaskToApprovedClass() {
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        when(items.findOwnedForUpdate(ITEM_ID, STUDENT_ID)).thenReturn(Optional.of(todoItem()));
        CourseEnrollment enrollment = new CourseEnrollment(UUID.randomUUID(), COURSE_ID, STUDENT_ID);
        enrollment.setStatus(EnrollmentStatus.APPROVED);
        when(enrollments.findByCourseOfferingIdAndStudentId(COURSE_ID, STUDENT_ID))
                .thenReturn(Optional.of(enrollment));
        when(items.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StudyPlanItem updated = service.updateItem(STUDENT_ID, PLAN_ID, ITEM_ID, new SaveStudyPlanItemCommand(
                "Ôn chương mới", null, StudyPlanItemType.TASK, null, null,
                NOW.plusSeconds(7200), null, COURSE_ID));

        assertThat(updated.id()).isEqualTo(ITEM_ID);
        assertThat(updated.courseOfferingId()).isEqualTo(COURSE_ID);
    }

    @Test
    void completingItemPersistsOneEventWithStudentsLocalDate() {
        StudyPlanItem todo = todoItem();
        when(items.findOwnedForUpdate(ITEM_ID, STUDENT_ID)).thenReturn(Optional.of(todo));
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        when(items.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StudyPlanItem result = service.changeItemStatus(
                STUDENT_ID, ITEM_ID, StudyPlanItemStatus.COMPLETED, "complete-123"
        );

        assertThat(result.status()).isEqualTo(StudyPlanItemStatus.COMPLETED);
        assertThat(result.completedAt()).isEqualTo(NOW);
        verify(learningEvents).recordStudyTaskCompleted(
                STUDENT_ID, ITEM_ID, "complete-123", NOW, LocalDate.of(2026, 10, 13)
        );
        verifyNoInteractions(notifications);
    }

    /** Args: none. Input: TODO item completed after its deadline. Output: completion plus one late notice; errors: assertions. */
    @Test
    void completingAfterDeadlineNotifiesAndLocksFurtherChanges() {
        StudyPlanItem overdue = new StudyPlanItem(ITEM_ID, PLAN_ID, "Đọc chương 1", null,
                StudyPlanItemType.TASK, null, null, NOW.minusSeconds(60),
                NOW.minusSeconds(120), null, StudyPlanItemStatus.TODO, null,
                NOW.minusSeconds(3600), NOW.minusSeconds(3600));
        when(items.findOwnedForUpdate(ITEM_ID, STUDENT_ID)).thenReturn(Optional.of(overdue));
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        when(items.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StudyPlanItem completed = service.changeItemStatus(STUDENT_ID, ITEM_ID,
                StudyPlanItemStatus.COMPLETED, "complete-late-123");

        assertThat(completed.completedAt()).isEqualTo(NOW);
        verify(notifications).createEventIfAbsent(eq(STUDENT_ID),
                eq(NotificationType.STUDY_PLAN_ITEM_LATE_COMPLETED), any(), any(),
                eq("STUDY_PLAN_ITEM"), eq(ITEM_ID), eq(overdue.dueAt()), eq(NOW), eq(true));

        when(items.findOwnedForUpdate(ITEM_ID, STUDENT_ID)).thenReturn(Optional.of(completed));
        assertThatThrownBy(() -> service.updateItem(STUDENT_ID, PLAN_ID, ITEM_ID,
                new SaveStudyPlanItemCommand("Đổi tên", null, StudyPlanItemType.TASK,
                        null, null, NOW.plusSeconds(3600), null)))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status().value()).isEqualTo(409);
                    assertThat(error.code()).isEqualTo("STUDY_PLAN_ITEM_LATE_COMPLETED_LOCKED");
                });
        assertThatThrownBy(() -> service.changeItemStatus(STUDENT_ID, ITEM_ID,
                StudyPlanItemStatus.TODO, null))
                .isInstanceOfSatisfying(ApiException.class, error ->
                        assertThat(error.code()).isEqualTo("STUDY_PLAN_ITEM_LATE_COMPLETED_LOCKED"));
        assertThat(service.changeItemStatus(STUDENT_ID, ITEM_ID, StudyPlanItemStatus.COMPLETED, null))
                .isEqualTo(completed);
        assertThatThrownBy(() -> service.cancelItem(STUDENT_ID, PLAN_ID, ITEM_ID))
                .isInstanceOfSatisfying(ApiException.class, error ->
                        assertThat(error.code()).isEqualTo("STUDY_PLAN_ITEM_LATE_COMPLETED_LOCKED"));

        service.deleteItem(STUDENT_ID, PLAN_ID, ITEM_ID);
        ArgumentCaptor<StudyPlanItem> saved = ArgumentCaptor.forClass(StudyPlanItem.class);
        verify(items, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues().get(1).status()).isEqualTo(StudyPlanItemStatus.DELETED);
        assertThat(saved.getAllValues().get(1).completedAt()).isEqualTo(NOW);
    }

    /** Args: none. Input: on-time completed item with an unchanged past deadline. Output: editable title; errors: assertions. */
    @Test
    void onTimeCompletedItemCanStillBeEditedAfterItsDeadline() {
        Instant dueAt = NOW.minusSeconds(60);
        StudyPlanItem completed = new StudyPlanItem(ITEM_ID, PLAN_ID, "Ôn cũ", null,
                StudyPlanItemType.TASK, null, null, dueAt, NOW.minusSeconds(3600), null,
                StudyPlanItemStatus.COMPLETED, dueAt.minusSeconds(60),
                NOW.minusSeconds(7200), NOW.minusSeconds(7200));
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        when(items.findOwnedForUpdate(ITEM_ID, STUDENT_ID)).thenReturn(Optional.of(completed));
        when(items.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StudyPlanItem updated = service.updateItem(STUDENT_ID, PLAN_ID, ITEM_ID,
                new SaveStudyPlanItemCommand("Ôn mới", null, StudyPlanItemType.TASK,
                        null, null, dueAt, 1440));

        assertThat(updated.title()).isEqualTo("Ôn mới");
        assertThat(updated.completedAt()).isEqualTo(completed.completedAt());
        assertThat(updated.reminderAt()).isEqualTo(completed.reminderAt());
    }

    @Test
    void completingItemRequiresAnIdempotencyKey() {
        when(items.findOwnedForUpdate(ITEM_ID, STUDENT_ID)).thenReturn(Optional.of(todoItem()));
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));

        assertThatThrownBy(() -> service.changeItemStatus(
                STUDENT_ID, ITEM_ID, StudyPlanItemStatus.COMPLETED, null
        )).isInstanceOfSatisfying(ApiException.class, error -> {
            assertThat(error.status().value()).isEqualTo(422);
            assertThat(error.code()).isEqualTo("IDEMPOTENCY_KEY_REQUIRED");
        });
        verify(items, never()).save(any());
    }

    @Test
    void calendarRejectsAWindowLongerThanThirtyOneDays() {
        assertThatThrownBy(() -> service.calendar(
                STUDENT_ID,
                Instant.parse("2026-10-01T00:00:00Z"),
                Instant.parse("2026-11-02T00:00:00Z")
        )).isInstanceOfSatisfying(ApiException.class, error -> {
            assertThat(error.status().value()).isEqualTo(422);
            assertThat(error.code()).isEqualTo("INVALID_CALENDAR_RANGE");
        });
    }

    /** Args: none. Input: completed owned item. Output: hidden record with completion history intact; errors: assertions. */
    @Test
    void deleteItemHidesItButPreservesCompletionTimestamp() {
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        StudyPlanItem completed = todoItem().changeStatus(StudyPlanItemStatus.COMPLETED, NOW.minusSeconds(60));
        when(items.findOwnedForUpdate(ITEM_ID, STUDENT_ID)).thenReturn(Optional.of(completed));
        when(items.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.deleteItem(STUDENT_ID, PLAN_ID, ITEM_ID);

        ArgumentCaptor<StudyPlanItem> saved = ArgumentCaptor.forClass(StudyPlanItem.class);
        verify(items).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(StudyPlanItemStatus.DELETED);
        assertThat(saved.getValue().completedAt()).isEqualTo(NOW.minusSeconds(60));
        verifyNoInteractions(learningEvents);
    }

    /** Args: none. Input: completed owned item. Output: physical item/history cleanup; errors: assertions. */
    @Test
    void permanentlyDeleteRemovesItemCompletionEventAndNotifications() {
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        StudyPlanItem completed = todoItem().changeStatus(StudyPlanItemStatus.COMPLETED, NOW.plusSeconds(60));
        when(items.findOwnedForUpdate(ITEM_ID, STUDENT_ID)).thenReturn(Optional.of(completed));

        service.permanentlyDeleteItem(STUDENT_ID, PLAN_ID, ITEM_ID);

        verify(notifications).deleteStudyPlanItemNotifications(STUDENT_ID, ITEM_ID);
        verify(learningEvents).deleteStudyTaskCompletionEvents(STUDENT_ID, ITEM_ID);
        verify(items).delete(completed);
        verify(items, never()).save(any());
    }

    /** Args: none. Input: same permanent-delete request repeated. Output: one cleanup; errors: assertions. */
    @Test
    void permanentlyDeleteIsIdempotentAfterTheItemIsGone() {
        when(plans.findOwned(PLAN_ID, STUDENT_ID)).thenReturn(Optional.of(plan));
        StudyPlanItem completed = todoItem().changeStatus(StudyPlanItemStatus.COMPLETED, NOW);
        when(items.findOwnedForUpdate(ITEM_ID, STUDENT_ID))
                .thenReturn(Optional.of(completed), Optional.empty());

        service.permanentlyDeleteItem(STUDENT_ID, PLAN_ID, ITEM_ID);
        service.permanentlyDeleteItem(STUDENT_ID, PLAN_ID, ITEM_ID);

        verify(items).delete(completed);
        verify(learningEvents).deleteStudyTaskCompletionEvents(STUDENT_ID, ITEM_ID);
        verify(notifications).deleteStudyPlanItemNotifications(STUDENT_ID, ITEM_ID);
    }

    private static UserAccount activeStudent() {
        return new UserAccount(
                STUDENT_ID,
                "b22dccn002@ptit.edu.vn",
                "b22dccn002",
                "password-hash",
                "Sinh viên kiểm thử",
                "Asia/Ho_Chi_Minh",
                UserRole.STUDENT,
                UserStatus.ACTIVE,
                NOW.minusSeconds(1000),
                NOW.minusSeconds(1000),
                NOW.minusSeconds(1000)
        );
    }

    private static StudyPlanItem todoItem() {
        return new StudyPlanItem(
                ITEM_ID, PLAN_ID, "Đọc chương 1", null, StudyPlanItemType.TASK,
                null, null, Instant.parse("2026-10-15T12:00:00Z"),
                Instant.parse("2026-10-14T12:00:00Z"), null,
                StudyPlanItemStatus.TODO, null, NOW.minusSeconds(100), NOW.minusSeconds(100)
        );
    }
}
