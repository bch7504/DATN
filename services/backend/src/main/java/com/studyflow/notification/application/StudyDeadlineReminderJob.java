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
     * Input: current database state and system clock. Output: void; processes at most 200 upcoming
     * reminders per scan. Errors: database failures leave pending items for the next scan.
     */
    @Scheduled(fixedDelayString = "${studyflow.notifications.reminder-scan-delay:60000}")
    public void generateReminders() {
        notifications.generateDueStudyPlanReminders();
    }

    /**
     * Args: none. Input: current database state and system clock. Output: void; processes at most
     * 200 past-due items per scan, independent of reminder failures. Errors: database failures
     * leave unnotified items for retry; owner/type/source uniqueness prevents duplicates.
     */
    @Scheduled(fixedDelayString = "${studyflow.notifications.reminder-scan-delay:60000}")
    public void generateExpiryNotifications() {
        notifications.generateExpiredStudyPlanNotifications();
    }
}
