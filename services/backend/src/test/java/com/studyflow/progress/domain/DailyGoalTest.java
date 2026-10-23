package com.studyflow.progress.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DailyGoalTest {

    @Test
    @DisplayName("Should create default goal with 5 pages, 10 quiz questions, 2 tasks")
    void shouldCreateDefaultGoal() {
        UUID studentId = UUID.randomUUID();
        Instant now = Instant.now();

        DailyGoal goal = DailyGoal.defaultForStudent(studentId, now);

        assertEquals(studentId, goal.getStudentId());
        assertEquals(5, goal.getPageTarget());
        assertEquals(10, goal.getQuizQuestionTarget());
        assertEquals(2, goal.getTaskTarget());
        assertEquals(17, goal.getTotalTarget());
    }

    @Test
    @DisplayName("Should update targets when inputs are valid")
    void shouldUpdateTargetsSuccessfully() {
        DailyGoal goal = DailyGoal.defaultForStudent(UUID.randomUUID(), Instant.now());
        Instant updateTime = Instant.now();

        goal.updateTargets(10, 25, 5, updateTime);

        assertEquals(10, goal.getPageTarget());
        assertEquals(25, goal.getQuizQuestionTarget());
        assertEquals(5, goal.getTaskTarget());
        assertEquals(40, goal.getTotalTarget());
        assertEquals(updateTime, goal.getUpdatedAt());
    }

    @Test
    @DisplayName("Should reject update if total target is zero")
    void shouldRejectZeroTotalTarget() {
        DailyGoal goal = DailyGoal.defaultForStudent(UUID.randomUUID(), Instant.now());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                goal.updateTargets(0, 0, 0, Instant.now())
        );
        assertTrue(ex.getMessage().contains("greater than 0"));
    }

    @Test
    @DisplayName("Should reject update if any target is negative")
    void shouldRejectNegativeTarget() {
        DailyGoal goal = DailyGoal.defaultForStudent(UUID.randomUUID(), Instant.now());

        assertThrows(IllegalArgumentException.class, () ->
                goal.updateTargets(-1, 10, 2, Instant.now())
        );
        assertThrows(IllegalArgumentException.class, () ->
                goal.updateTargets(5, -1, 2, Instant.now())
        );
        assertThrows(IllegalArgumentException.class, () ->
                goal.updateTargets(5, 10, -1, Instant.now())
        );
    }

    @Test
    @DisplayName("Should reject update if targets exceed upper bounds")
    void shouldRejectOutOfBoundsTargets() {
        DailyGoal goal = DailyGoal.defaultForStudent(UUID.randomUUID(), Instant.now());

        assertThrows(IllegalArgumentException.class, () ->
                goal.updateTargets(101, 10, 2, Instant.now())
        );
        assertThrows(IllegalArgumentException.class, () ->
                goal.updateTargets(5, 201, 2, Instant.now())
        );
        assertThrows(IllegalArgumentException.class, () ->
                goal.updateTargets(5, 10, 51, Instant.now())
        );
    }
}
