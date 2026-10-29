package com.studyflow.progress.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Complete Student dashboard; every metric is calculated by Java from authorized app data. */
public record StudentDashboardResponse(
        LocalDate date,
        String timeZone,
        Streak streak,
        DailyGoal dailyGoal,
        Overview overview,
        List<UpcomingItem> upcomingItems,
        List<CourseProgress> activeCourseOfferings
) {
    /** Current and historical streak calculated from valid learning events. */
    public record Streak(int currentStreak, int longestStreak, List<LocalDate> activityDays) { }
    /** Targets and actuals for the Student's current local day. */
    public record DailyGoal(int pageTarget, int pageActual, int quizQuestionTarget,
                            int quizQuestionActual, int taskTarget, int taskActual) { }
    /** Aggregate progress across authorized class content and the Student's own work. */
    public record Overview(int viewedPages, int totalPublishedPages, int completedTasks,
                           int totalTasks, int completedQuizzes, double averageQuizScore) { }
    /** One upcoming personal task or published assignment; assignment IDs remain read-only. */
    public record UpcomingItem(UUID id, String title, Instant dueAt, String type, UUID courseOfferingId) { }
    /** Progress for one ACTIVE offering with APPROVED enrollment. */
    public record CourseProgress(UUID courseOfferingId, String code, String name, int viewedPages,
                                 int totalPublishedPages, int progressPercent, int completedQuizzes,
                                 double averageQuizScore, int completedTasks, int totalTasks) { }
}
