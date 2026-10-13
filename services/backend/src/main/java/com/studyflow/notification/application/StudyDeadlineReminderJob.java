package com.studyflow.notification.application;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class StudyDeadlineReminderJob {

    private final NotificationService notifications;

    /**
     * Creates the scheduled deadline reminder adapter.
     *
     * @param notifications application service that performs an idempotent bounded scan
     */
    public StudyDeadlineReminderJob(NotificationService notifications) {
        this.notifications = notifications;
    }

    /**
     * Runs after the configured fixed delay without external arguments.
     *
     * Input: current database state and system clock. Output: void. The called service processes
     * at most 200 due reminders and database uniqueness makes retries idempotent.
     */
    @Scheduled(fixedDelayString = "${studyflow.notifications.reminder-scan-delay:60000}")
    public void generateReminders() {
        notifications.generateDueStudyPlanReminders();
    }
}
