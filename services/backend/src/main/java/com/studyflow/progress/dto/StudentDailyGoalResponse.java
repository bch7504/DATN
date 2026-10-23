package com.studyflow.progress.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

/**
 * REST response for daily goal target configuration and actual progress.
 * Supports both spec naming (pageTarget/actual) and frontend naming (targetPages/actualPages).
 */
public record StudentDailyGoalResponse(
        int pageTarget,
        int pageActual,
        int quizQuestionTarget,
        int quizQuestionActual,
        int taskTarget,
        int taskActual,
        boolean completed,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate date,
        String timeZone,

        @JsonProperty("targetPages") int targetPages,
        @JsonProperty("actualPages") int actualPages,
        @JsonProperty("pagesPercentage") int pagesPercentage,
        @JsonProperty("targetQuizQuestions") int targetQuizQuestions,
        @JsonProperty("actualQuizQuestions") int actualQuizQuestions,
        @JsonProperty("quizPercentage") int quizPercentage,
        @JsonProperty("targetTasks") int targetTasks,
        @JsonProperty("actualTasks") int actualTasks,
        @JsonProperty("tasksPercentage") int tasksPercentage,
        @JsonProperty("isCompleted") boolean isCompleted
) {
    @JsonProperty("quizQuestionsPercentage")
    public int quizQuestionsPercentage() {
        return quizPercentage;
    }

    public static StudentDailyGoalResponse from(
            int pageTarget, int pageActual,
            int quizTarget, int quizActual,
            int taskTarget, int taskActual,
            boolean completed, LocalDate date, String timeZone
    ) {
        int pagesPct = pageTarget > 0 ? Math.min(100, (int) Math.round(((double) pageActual / pageTarget) * 100)) : 100;
        int quizPct = quizTarget > 0 ? Math.min(100, (int) Math.round(((double) quizActual / quizTarget) * 100)) : 100;
        int taskPct = taskTarget > 0 ? Math.min(100, (int) Math.round(((double) taskActual / taskTarget) * 100)) : 100;

        return new StudentDailyGoalResponse(
                pageTarget, pageActual,
                quizTarget, quizActual,
                taskTarget, taskActual,
                completed, date, timeZone,
                pageTarget, pageActual, pagesPct,
                quizTarget, quizActual, quizPct,
                taskTarget, taskActual, taskPct,
                completed
        );
    }
}
