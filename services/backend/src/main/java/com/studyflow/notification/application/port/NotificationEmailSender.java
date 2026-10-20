package com.studyflow.notification.application.port;

/** SMTP boundary for one plain-text Student notification. */
public interface NotificationEmailSender {

    /**
     * Args: recipient, title and body are nonblank plain text.
     * Input: eligible verified Student email selected from the account record.
     * Output: void; SMTP provider accepts the message. Errors: mail failures propagate for retry.
     */
    void send(String recipient, String title, String body);
}
