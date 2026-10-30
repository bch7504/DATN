package com.studyflow.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserStatus;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidationException;

class SecurityConfigTest {

    @Test
    void jwtRoleClaimMapsToSpringRoleAuthority() {
        Jwt token = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject("4a754e8d-70ae-4ba9-af24-85d4e5506e65")
                .issuedAt(Instant.parse("2026-10-13T09:00:00Z"))
                .expiresAt(Instant.parse("2026-10-13T09:15:00Z"))
                .claim("role", "TEACHER")
                .build();

        var authentication = new SecurityConfig().jwtAuthenticationConverter().convert(token);

        assertThat(authentication).isNotNull();
        assertThat(authentication.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_TEACHER");
    }

    @Test
    void accessTokenRejectsAccountWhoseRoleChangedOrWasLocked() {
        SecurityConfig config = new SecurityConfig();
        AuthProperties props = new AuthProperties("stu.ptit.edu.vn", Duration.ofMinutes(10), Duration.ofMinutes(1),
                5, Duration.ofMinutes(15), Duration.ofDays(30), "studyflow",
                "01234567890123456789012345678901", true, "no-reply@ptit.edu.vn");
        SecretKey key = config.jwtSecretKey(props);
        UserAccountStore users = mock(UserAccountStore.class);
        Instant now = Instant.now();
        UserAccount account = UserAccount.verifiedStudent("student@stu.ptit.edu.vn", "hash", "Student", now);
        String token = new JwtSessionTokenIssuer(config.jwtEncoder(key), props).issue(account, now).accessToken();
        var decoder = config.jwtDecoder(key, props, users);
        when(users.findById(account.id())).thenReturn(Optional.of(account));
        assertThat(decoder.decode(token).getSubject()).isEqualTo(account.id().toString());

        UserAccount promoted = new UserAccount(account.id(), account.email(), account.username(),
                account.passwordHash(), account.fullName(), account.timeZone(), UserRole.TEACHER,
                UserStatus.ACTIVE, account.emailVerifiedAt(), account.createdAt(), now);
        when(users.findById(account.id())).thenReturn(Optional.of(promoted));
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtValidationException.class);

        UserAccount locked = new UserAccount(account.id(), account.email(), account.username(),
                account.passwordHash(), account.fullName(), account.timeZone(), UserRole.STUDENT,
                UserStatus.LOCKED, account.emailVerifiedAt(), account.createdAt(), now);
        when(users.findById(account.id())).thenReturn(Optional.of(locked));
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtValidationException.class);
    }
}
