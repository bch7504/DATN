package com.studyflow.notification.infrastructure;

import com.studyflow.auth.infrastructure.AuthProperties;
import com.studyflow.notification.application.port.NotificationEmailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpNotificationEmailSender implements NotificationEmailSender {
    private final JavaMailSender mailSender;
    private final AuthProperties properties;

    /** Args: configured sender and mail-from properties; input: SMTP configuration; output: adapter; errors: none. */
    public SmtpNotificationEmailSender(JavaMailSender mailSender, AuthProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Override
    public void send(String recipient, String title, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.mailFrom());
        message.setTo(recipient);
        message.setSubject("StudyFlow: " + title);
        message.setText(body);
        mailSender.send(message);
    }
}
