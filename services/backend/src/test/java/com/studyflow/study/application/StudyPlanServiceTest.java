package com.studyflow.study.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ApiException;
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

    @Mock
    private StudyPlanStore plans;

    @Mock
    private StudyPlanItemStore items;

    @Mock
    private LearningEventStore learningEvents;

    @Mock
    private UserAccountStore users;

    private StudyPlanService service;
    private StudyPlan plan;

    @BeforeEach
    void setUp() {
        service = new StudyPlanService(
                plans, items, learningEvents, users, Clock.fixed(NOW, ZoneOffset.UTC)
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
                null
        );

        assertThatThrownBy(() -> service.createItem(STUDENT_ID, PLAN_ID, command))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status().value()).isEqualTo(409);
                    assertThat(error.code()).isEqualTo("STUDY_SCHEDULE_CONFLICT");
                });
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
                StudyPlanItemStatus.TODO, null, NOW.minusSeconds(100), NOW.minusSeconds(100)
        );
    }
}
