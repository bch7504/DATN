package com.studyflow.progress.application;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StudyStreakCalculatorTest {

    private final LocalDate today = LocalDate.of(2026, 10, 21);

    @Test
    @DisplayName("Should return 0 for all metrics when activity list is empty")
    void shouldReturnZeroForEmptyActivities() {
        StudyStreakCalculator.StreakResult result = StudyStreakCalculator.calculate(List.of(), today);

        assertEquals(0, result.currentStreak());
        assertEquals(0, result.longestStreak());
        assertEquals(0, result.activityDays());
    }

    @Test
    @DisplayName("Should return 1 when active only today")
    void shouldReturnOneWhenActiveOnlyToday() {
        StudyStreakCalculator.StreakResult result = StudyStreakCalculator.calculate(List.of(today), today);

        assertEquals(1, result.currentStreak());
        assertEquals(1, result.longestStreak());
        assertEquals(1, result.activityDays());
    }

    @Test
    @DisplayName("Should preserve streak when active yesterday but not yet today")
    void shouldPreserveStreakWhenActiveYesterday() {
        LocalDate yesterday = today.minusDays(1);
        LocalDate twoDaysAgo = today.minusDays(2);

        StudyStreakCalculator.StreakResult result = StudyStreakCalculator.calculate(
                List.of(twoDaysAgo, yesterday), today);

        assertEquals(2, result.currentStreak());
        assertEquals(2, result.longestStreak());
        assertEquals(2, result.activityDays());
    }

    @Test
    @DisplayName("Should break current streak when missed yesterday")
    void shouldBreakStreakWhenMissedYesterday() {
        LocalDate twoDaysAgo = today.minusDays(2);
        LocalDate threeDaysAgo = today.minusDays(3);

        StudyStreakCalculator.StreakResult result = StudyStreakCalculator.calculate(
                List.of(threeDaysAgo, twoDaysAgo), today);

        assertEquals(0, result.currentStreak());
        assertEquals(2, result.longestStreak());
        assertEquals(2, result.activityDays());
    }

    @Test
    @DisplayName("Should track longest streak across multiple periods")
    void shouldTrackLongestStreakCorrectly() {
        // Past streak of 5 days: Oct 1 to Oct 5
        // Gap: Oct 6 to Oct 18
        // Current streak of 3 days: Oct 19, Oct 20, Oct 21 (today)
        List<LocalDate> dates = List.of(
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 2),
                LocalDate.of(2026, 10, 3),
                LocalDate.of(2026, 10, 4),
                LocalDate.of(2026, 10, 5),
                LocalDate.of(2026, 10, 19),
                LocalDate.of(2026, 10, 20),
                LocalDate.of(2026, 10, 21)
        );

        StudyStreakCalculator.StreakResult result = StudyStreakCalculator.calculate(dates, today);

        assertEquals(3, result.currentStreak());
        assertEquals(5, result.longestStreak());
        assertEquals(8, result.activityDays());
    }
}
