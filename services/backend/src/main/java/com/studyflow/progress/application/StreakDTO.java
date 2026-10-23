package com.studyflow.progress.application;

import java.time.LocalDate;

/**
 * DTO representing student's study streak progress.
 *
 * @param currentStreak current active consecutive study days
 * @param longestStreak maximum consecutive study days recorded in history
 * @param activityDays total lifetime distinct active days
 * @param timeZone resolved timezone string of the student
 * @param asOfDate current local date evaluated in the student's timezone
 */
public record StreakDTO(
        int currentStreak,
        int longestStreak,
        int activityDays,
        String timeZone,
        LocalDate asOfDate
) {}
