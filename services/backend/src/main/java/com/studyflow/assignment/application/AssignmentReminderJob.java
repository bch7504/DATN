package com.studyflow.assignment.application;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AssignmentReminderJob {
    private final AssignmentService assignments;

    /** args: assignment service; input: persisted due reminders and injected clock; output: void; errors: persistence exceptions propagate for scheduled retry. */
    public AssignmentReminderJob(AssignmentService assignments) { this.assignments = assignments; }

    /** Scans at the configured reminder interval; database uniqueness prevents duplicate notifications. */
    @Scheduled(fixedDelayString = "${studyflow.notifications.reminder-scan-delay:60000}")
    public void generateReminders() { assignments.generateDueReminders(); }

    /** Args: none. Input: expired published assignments. Output: void; idempotent notices and expiry markers. Errors: persistence failure is retried on next scheduled run. */
    @Scheduled(fixedDelayString = "${studyflow.notifications.reminder-scan-delay:60000}")
    public void generateExpiryNotices() { assignments.generateExpiryNotifications(); }
}
