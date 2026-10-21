package com.studyflow.progress.application;

/**
 * Command for updating daily learning targets.
 *
 * @param pageTarget target page count (0..100)
 * @param quizQuestionTarget target quiz question count (0..200)
 * @param taskTarget target task count (0..50)
 */
public record ConfigureDailyGoalCommand(
        int pageTarget,
        int quizQuestionTarget,
        int taskTarget
) {}
