package com.studyflow.progress.application;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Utility calculator for computing active streaks and longest streaks from a student's activity dates.
 */
public final class StudyStreakCalculator {

    private StudyStreakCalculator() {
    }

    /**
     * Args: activityDates, today.
     * Input: list of distinct active LocalDates and the current LocalDate evaluated in student's timezone.
     * Output: StreakResult containing currentStreak, longestStreak, and activityDays count.
     * Errors: NullPointerException if today is null.
     */
    public static StreakResult calculate(List<LocalDate> activityDates, LocalDate today) {
        Objects.requireNonNull(today, "today must not be null");
        if (activityDates == null || activityDates.isEmpty()) {
            return new StreakResult(0, 0, 0);
        }

        Set<LocalDate> dateSet = new HashSet<>(activityDates);
        int activityDays = dateSet.size();

        // 1. Calculate currentStreak
        int currentStreak = 0;
        LocalDate checkDate;
        if (dateSet.contains(today)) {
            checkDate = today;
        } else if (dateSet.contains(today.minusDays(1))) {
            checkDate = today.minusDays(1);
        } else {
            checkDate = null;
        }

        if (checkDate != null) {
            while (dateSet.contains(checkDate)) {
                currentStreak++;
                checkDate = checkDate.minusDays(1);
            }
        }

        // 2. Calculate longestStreak
        int longestStreak = 0;
        for (LocalDate d : dateSet) {
            if (!dateSet.contains(d.minusDays(1))) {
                int streak = 0;
                LocalDate current = d;
                while (dateSet.contains(current)) {
                    streak++;
                    current = current.plusDays(1);
                }
                if (streak > longestStreak) {
                    longestStreak = streak;
                }
            }
        }

        longestStreak = Math.max(longestStreak, currentStreak);

        return new StreakResult(currentStreak, longestStreak, activityDays);
    }

    public record StreakResult(int currentStreak, int longestStreak, int activityDays) {}
}
