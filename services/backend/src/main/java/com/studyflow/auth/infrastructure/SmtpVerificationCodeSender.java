package com.studyflow.auth.infrastructure;

import com.studyflow.auth.application.port.VerificationCodeSender;
import java.time.Instant;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public final class SmtpVerificationCodeSender implements VerificationCodeSender {

    private final JavaMailSender mailSender;
    private final AuthProperties properties;

    public SmtpVerificationCodeSender(JavaMailSender mailSender, AuthProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    /**
     * Sends a one-time verification code through the configured SMTP provider.
     *
     * @param email verified destination candidate supplied by the registration flow
     * @param displayName safe display name used only in the greeting
     * @param code six-digit secret that must never be logged or persisted raw
     * @param expiresAt UTC expiration instant displayed to the recipient
     * @throws MailException when the SMTP provider rejects or cannot deliver the message
     * @return void
     */
    @Override
    public void send(String email, String displayName, String code, Instant expiresAt) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.mailFrom());
        message.setTo(email);
        message.setSubject("Mã xác minh đăng ký StudyFlow");
        message.setText("Xin chào " + displayName + ",\n\n"
                + "Mã xác minh StudyFlow của bạn là: " + code + "\n"
                + "Mã có hiệu lực đến " + expiresAt + " (UTC).\n\n"
                + "Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.");
        mailSender.send(message);
    }
}
