package com.studyflow.progress.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.List;

/**
 * REST response representing student study streak and weekly activity history.
 */
public record StudentStreakResponse(
        int currentStreak,
        int longestStreak,
        int activityDays,
        String timeZone,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate asOfDate,
        String lastActiveDate,
        List<WeeklyDayActivity> weeklyActivity
) {
    @JsonProperty("today")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    public LocalDate today() {
        return asOfDate;
    }

    public record WeeklyDayActivity(
            String day,
            String date,
            boolean active,
            int count
    ) {}
}
