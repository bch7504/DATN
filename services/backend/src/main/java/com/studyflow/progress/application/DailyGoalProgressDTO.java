package com.studyflow.progress.application;

import java.time.LocalDate;

/**
 * DTO representing daily goal target configuration and actual progress for today.
 *
 * @param pageTarget target number of course material PDF pages to view
 * @param pageActual actual number of distinct pages viewed today
 * @param quizQuestionTarget target number of quiz questions to answer
 * @param quizQuestionActual actual number of questions answered in scored attempts today
 * @param taskTarget target number of study tasks to complete
 * @param taskActual actual number of study tasks completed today
 * @param completed true if all three actuals meet or exceed their respective targets
 * @param date current local date in student's timezone
 * @param timeZone student's timezone identifier
 */
public record DailyGoalProgressDTO(
        int pageTarget,
        int pageActual,
        int quizQuestionTarget,
        int quizQuestionActual,
        int taskTarget,
        int taskActual,
        boolean completed,
        LocalDate date,
        String timeZone
) {}
