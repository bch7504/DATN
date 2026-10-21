package com.studyflow.study.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.studyflow.study.domain.StudyPlanItem;
import com.studyflow.study.domain.StudyPlanItemStatus;
import com.studyflow.study.domain.StudyPlanItemType;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class StudyPlanItemResponseTest {
    private static final Instant NOW = Instant.parse("2026-10-16T00:00:00Z");

    /** Args: none. Input: unfinished task past its deadline. Output: OVERDUE display only; errors: assertions. */
    @Test
    void derivesOverdueWithoutChangingStoredTodo() {
        StudyPlanItem item = item(StudyPlanItemStatus.TODO, null);

        StudyPlanItemResponse response = StudyPlanItemResponse.from(item, NOW);

        assertThat(response.status()).isEqualTo(StudyPlanItemViewStatus.OVERDUE);
        assertThat(response.lateCompleted()).isFalse();
        assertThat(item.status()).isEqualTo(StudyPlanItemStatus.TODO);
    }

    /** Args: none. Input: completed task whose deadline is in the past. Output: COMPLETED, not OVERDUE. */
    @Test
    void completedTaskDoesNotBecomeOverdue() {
        StudyPlanItem item = item(StudyPlanItemStatus.COMPLETED, NOW.minusSeconds(7200));

        StudyPlanItemResponse response = StudyPlanItemResponse.from(item, NOW);

        assertThat(response.status()).isEqualTo(StudyPlanItemViewStatus.COMPLETED);
        assertThat(response.completedAt()).isEqualTo(NOW.minusSeconds(7200));
        assertThat(response.lateCompleted()).isFalse();
    }

    /** Args: none. Input: completion after dueAt. Output: lateCompleted=true with COMPLETED status. Errors: assertions. */
    @Test
    void completedAfterDeadlineIsMarkedLate() {
        StudyPlanItemResponse response = StudyPlanItemResponse.from(
                item(StudyPlanItemStatus.COMPLETED, NOW.minusSeconds(60)), NOW);
        assertThat(response.status()).isEqualTo(StudyPlanItemViewStatus.COMPLETED);
        assertThat(response.lateCompleted()).isTrue();
    }

    /** Args: persisted state and optional completion time. Output: synthetic item with earlier dueAt. */
    private static StudyPlanItem item(StudyPlanItemStatus status, Instant completedAt) {
        return new StudyPlanItem(UUID.randomUUID(), UUID.randomUUID(), "Synthetic task", null,
                StudyPlanItemType.TASK, null, null, NOW.minusSeconds(3600),
                NOW.minusSeconds(7200), null, status, completedAt, NOW.minusSeconds(10000), NOW, null);
    }
}
