package com.studyflow.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.auth.application.port.RefreshSessionStore;
import com.studyflow.admin.infrastructure.AdminJdbcStore;
import com.studyflow.auth.application.port.RegistrationChallengeStore;
import com.studyflow.auth.application.port.SecretHasher;
import com.studyflow.auth.application.port.SessionTokenIssuer;
import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.auth.application.port.VerificationCodeSender;
import com.studyflow.auth.domain.RegistrationChallenge;
import com.studyflow.auth.infrastructure.AuthProperties;
import com.studyflow.auth.infrastructure.VerificationCodeGenerator;
import com.studyflow.common.exception.ApiException;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-13T08:00:00Z");

    @Mock
    private UserAccountStore users;
    @Mock
    private RegistrationChallengeStore challenges;
    @Mock
    private RefreshSessionStore refreshSessions;
    @Mock
    private VerificationCodeSender codeSender;
    @Mock
    private SecretHasher hasher;
    @Mock
    private SessionTokenIssuer tokenIssuer;
    @Mock
    private VerificationCodeGenerator codeGenerator;
    @Mock
    private AdminJdbcStore adminSettings;

    private AuthService service;

    @BeforeEach
    void setUp() {
        AuthProperties properties = new AuthProperties(
                "stu.ptit.edu.vn",
                Duration.ofMinutes(10),
                Duration.ofSeconds(60),
                5,
                Duration.ofMinutes(15),
                Duration.ofDays(30),
                "studyflow",
                "01234567890123456789012345678901",
                true,
                "no-reply@ptit.edu.vn"
        );
        service = new AuthService(
                users,
                challenges,
                refreshSessions,
                codeSender,
                hasher,
                tokenIssuer,
                codeGenerator,
                properties,
                Clock.fixed(NOW, ZoneOffset.UTC),
                adminSettings
        );
        org.mockito.Mockito.lenient().when(adminSettings.registrationEnabled()).thenReturn(true);
    }

    @Test
    void startRegistrationStoresOnlyHashesAndSendsOtp() {
        when(users.existsByEmail("b22dccn001@stu.ptit.edu.vn")).thenReturn(false);
        when(challenges.findByEmailForUpdate("b22dccn001@stu.ptit.edu.vn")).thenReturn(Optional.empty());
        when(codeGenerator.generate()).thenReturn("123456");
        when(hasher.hash("StrongPass1")).thenReturn("password-hash");
        when(hasher.hash("123456")).thenReturn("code-hash");
        when(challenges.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RegistrationStatus result = service.startRegistration(new StartRegistrationCommand(
                "Nguyễn Văn A",
                "B22DCCN001@STU.PTIT.EDU.VN",
                "StrongPass1"
        ));

        ArgumentCaptor<RegistrationChallenge> challenge = ArgumentCaptor.forClass(RegistrationChallenge.class);
        verify(challenges).save(challenge.capture());
        assertThat(challenge.getValue().email()).isEqualTo("b22dccn001@stu.ptit.edu.vn");
        assertThat(challenge.getValue().passwordHash()).isEqualTo("password-hash");
        assertThat(challenge.getValue().codeHash()).isEqualTo("code-hash");
        assertThat(challenge.getValue().expiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(10)));
        verify(codeSender).send(
                "b22dccn001@stu.ptit.edu.vn",
                "Nguyễn Văn A",
                "123456",
                NOW.plus(Duration.ofMinutes(10))
        );
        assertThat(result.status()).isEqualTo("VERIFICATION_REQUIRED");
    }

    @Test
    void registrationSettingStopsNewChallengeBeforeSendingOtp() {
        when(adminSettings.registrationEnabled()).thenReturn(false);
        assertThatThrownBy(() -> service.startRegistration(new StartRegistrationCommand(
                "Nguyễn Văn A", "b22dccn001@stu.ptit.edu.vn", "StrongPass1")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Đăng ký tài khoản hiện đang tạm dừng");
        verify(challenges, never()).save(any());
        verify(codeSender, never()).send(any(), any(), any(), any());
    }

    @Test
    void startRegistrationRejectsWrongPtitAndSubdomainEmail() {
        assertThatThrownBy(() -> service.startRegistration(
                new StartRegistrationCommand("Student", "student@gmail.com", "StrongPass1")
        )).isInstanceOfSatisfying(ApiException.class, error ->
                assertThat(error.code()).isEqualTo("EMAIL_DOMAIN_NOT_ALLOWED"));

        assertThatThrownBy(() -> service.startRegistration(
                new StartRegistrationCommand("Student", "student@mail.ptit.edu.vn", "StrongPass1")
        )).isInstanceOfSatisfying(ApiException.class, error ->
                assertThat(error.code()).isEqualTo("EMAIL_DOMAIN_NOT_ALLOWED"));

        assertThatThrownBy(() -> service.startRegistration(
                new StartRegistrationCommand("Student", "student@ptit.edu.vn", "StrongPass1")
        )).isInstanceOfSatisfying(ApiException.class, error ->
                assertThat(error.code()).isEqualTo("EMAIL_DOMAIN_NOT_ALLOWED"));

        assertThatThrownBy(() -> service.startRegistration(
                new StartRegistrationCommand("Student", "student@mail.stu.ptit.edu.vn", "StrongPass1")
        )).isInstanceOfSatisfying(ApiException.class, error ->
                assertThat(error.code()).isEqualTo("EMAIL_DOMAIN_NOT_ALLOWED"));

        verify(challenges, never()).save(any());
        verify(codeSender, never()).send(any(), any(), any(), any());
    }

    @Test
    void verifyRegistrationCreatesActiveStudentAndConsumesChallenge() {
        RegistrationChallenge challenge = RegistrationChallenge.issue(
                "b22dccn001@stu.ptit.edu.vn",
                "Nguyễn Văn A",
                "password-hash",
                "code-hash",
                NOW.minusSeconds(30),
                Duration.ofMinutes(10),
                Duration.ofSeconds(60),
                5
        );
        when(challenges.findByEmailForUpdate(challenge.email())).thenReturn(Optional.of(challenge));
        when(hasher.matches("123456", "code-hash")).thenReturn(true);
        when(users.existsByEmail(challenge.email())).thenReturn(false);
        when(users.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(challenges.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.verifyRegistration(new VerifyRegistrationCommand(challenge.email(), "123456"));

        ArgumentCaptor<UserAccount> account = ArgumentCaptor.forClass(UserAccount.class);
        verify(users).save(account.capture());
        assertThat(account.getValue().email()).isEqualTo(challenge.email());
        assertThat(account.getValue().role().name()).isEqualTo("STUDENT");
        assertThat(account.getValue().status().name()).isEqualTo("ACTIVE");

        ArgumentCaptor<RegistrationChallenge> consumed = ArgumentCaptor.forClass(RegistrationChallenge.class);
        verify(challenges).save(consumed.capture());
        assertThat(consumed.getValue().consumedAt()).isEqualTo(NOW);
    }

    @Test
    void verifyRegistrationDecrementsAttemptsForWrongOtp() {
        RegistrationChallenge challenge = RegistrationChallenge.issue(
                "b22dccn001@stu.ptit.edu.vn",
                "Student",
                "password-hash",
                "code-hash",
                NOW,
                Duration.ofMinutes(10),
                Duration.ofSeconds(60),
                5
        );
        when(challenges.findByEmailForUpdate(challenge.email())).thenReturn(Optional.of(challenge));
        when(hasher.matches("000000", "code-hash")).thenReturn(false);
        when(challenges.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThatThrownBy(() -> service.verifyRegistration(
                new VerifyRegistrationCommand(challenge.email(), "000000")
        )).isInstanceOfSatisfying(ApiException.class, error ->
                assertThat(error.code()).isEqualTo("VERIFICATION_INVALID"));

        ArgumentCaptor<RegistrationChallenge> saved = ArgumentCaptor.forClass(RegistrationChallenge.class);
        verify(challenges).save(saved.capture());
        assertThat(saved.getValue().attemptsRemaining()).isEqualTo(4);
        verify(users, never()).save(any());
    }

    @Test
    void loginCreatesHashedRefreshSessionForActiveAccount() {
        UserAccount account = new UserAccount(
                java.util.UUID.randomUUID(),
                "b22dccn001@ptit.edu.vn",
                "b22dccn001",
                "password-hash",
                "Nguyễn Văn A",
                "Asia/Ho_Chi_Minh",
                UserRole.STUDENT,
                UserStatus.ACTIVE,
                NOW,
                NOW,
                NOW
        );
        SessionTokens issued = new SessionTokens(
                "access-token",
                NOW.plus(Duration.ofMinutes(15)),
                "refresh-token",
                NOW.plus(Duration.ofDays(30))
        );
        when(users.findByIdentifier("b22dccn001@ptit.edu.vn")).thenReturn(Optional.of(account));
        when(hasher.matches("StrongPass1", "password-hash")).thenReturn(true);
        when(tokenIssuer.issue(account, NOW)).thenReturn(issued);
        when(tokenIssuer.hashRefreshToken("refresh-token")).thenReturn("refresh-hash");
        when(refreshSessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        SessionTokens result = service.login(new LoginCommand(
                "B22DCCN001@PTIT.EDU.VN",
                "StrongPass1"
        ));

        assertThat(result).isEqualTo(issued);
        var session = ArgumentCaptor.forClass(com.studyflow.auth.domain.RefreshSession.class);
        verify(refreshSessions).save(session.capture());
        assertThat(session.getValue().userId()).isEqualTo(account.id());
        assertThat(session.getValue().tokenHash()).isEqualTo("refresh-hash");
    }
}
