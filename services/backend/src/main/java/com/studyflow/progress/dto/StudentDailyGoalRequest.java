package com.studyflow.progress.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for configuring daily learning goal targets.
 */
public record StudentDailyGoalRequest(
        @JsonAlias("targetPages")
        @NotNull(message = "pageTarget is required")
        @Min(value = 0, message = "pageTarget must be >= 0")
        @Max(value = 100, message = "pageTarget cannot exceed 100")
        Integer pageTarget,

        @JsonAlias("targetQuizQuestions")
        @NotNull(message = "quizQuestionTarget is required")
        @Min(value = 0, message = "quizQuestionTarget must be >= 0")
        @Max(value = 200, message = "quizQuestionTarget cannot exceed 200")
        Integer quizQuestionTarget,

        @JsonAlias("targetTasks")
        @NotNull(message = "taskTarget is required")
        @Min(value = 0, message = "taskTarget must be >= 0")
        @Max(value = 50, message = "taskTarget cannot exceed 50")
        Integer taskTarget
) {
    public int totalTarget() {
        return (pageTarget != null ? pageTarget : 0)
                + (quizQuestionTarget != null ? quizQuestionTarget : 0)
                + (taskTarget != null ? taskTarget : 0);
    }
}
