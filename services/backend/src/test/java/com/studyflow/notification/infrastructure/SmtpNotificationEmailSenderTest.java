package com.studyflow.notification.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.auth.infrastructure.AuthProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class SmtpNotificationEmailSenderTest {
    @Mock private JavaMailSender mail;
    @Mock private AuthProperties properties;

    /** Args: none. Input: synthetic PTIT recipient and stubbed sender; output: asserts message fields; errors: assertion failure. */
    @Test
    void sendsPlainTextToRegisteredStudentUsingConfiguredFromAddress() {
        when(properties.mailFrom()).thenReturn("studyflow@example.invalid");

        new SmtpNotificationEmailSender(mail, properties)
                .send("student@stu.ptit.edu.vn", "Bài tập mới", "Xem bài tập trong StudyFlow.");

        ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        assertThat(message.getValue().getFrom()).isEqualTo("studyflow@example.invalid");
        assertThat(message.getValue().getTo()).containsExactly("student@stu.ptit.edu.vn");
        assertThat(message.getValue().getSubject()).isEqualTo("StudyFlow: Bài tập mới");
        assertThat(message.getValue().getText()).isEqualTo("Xem bài tập trong StudyFlow.");
    }
}
