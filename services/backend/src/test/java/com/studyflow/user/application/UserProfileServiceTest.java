package com.studyflow.user.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-13T09:00:00Z");

    @Mock
    private UserAccountStore users;

    private UserProfileService service;
    private UserAccount account;

    @BeforeEach
    void setUp() {
        service = new UserProfileService(users, Clock.fixed(NOW, ZoneOffset.UTC));
        account = new UserAccount(
                UUID.randomUUID(),
                "b22dccn001@ptit.edu.vn",
                "b22dccn001",
                "password-hash",
                "Nguyễn Văn A",
                "Asia/Ho_Chi_Minh",
                UserRole.STUDENT,
                UserStatus.ACTIVE,
                NOW.minusSeconds(100),
                NOW.minusSeconds(100),
                NOW.minusSeconds(100)
        );
    }

    @Test
    void getProfileReturnsOnlySafeFieldsForActiveAccount() {
        when(users.findById(account.id())).thenReturn(Optional.of(account));

        UserProfile profile = service.getProfile(account.id());

        assertThat(profile.id()).isEqualTo(account.id());
        assertThat(profile.displayName()).isEqualTo("Nguyễn Văn A");
        assertThat(profile.email()).isEqualTo("b22dccn001@ptit.edu.vn");
        assertThat(profile.role()).isEqualTo(UserRole.STUDENT);
    }

    @Test
    void updateProfileChangesOnlyEditableFields() {
        when(users.findByIdForUpdate(account.id())).thenReturn(Optional.of(account));
        when(users.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfile profile = service.updateProfile(
                account.id(),
                new UpdateProfileCommand("  Nguyễn Văn B  ", "Asia/Bangkok")
        );

        ArgumentCaptor<UserAccount> saved = ArgumentCaptor.forClass(UserAccount.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().fullName()).isEqualTo("Nguyễn Văn B");
        assertThat(saved.getValue().timeZone()).isEqualTo("Asia/Bangkok");
        assertThat(saved.getValue().email()).isEqualTo(account.email());
        assertThat(saved.getValue().role()).isEqualTo(account.role());
        assertThat(saved.getValue().status()).isEqualTo(account.status());
        assertThat(saved.getValue().updatedAt()).isEqualTo(NOW);
        assertThat(profile.displayName()).isEqualTo("Nguyễn Văn B");
    }

    @Test
    void updateProfileRejectsInvalidTimeZone() {
        when(users.findByIdForUpdate(account.id())).thenReturn(Optional.of(account));

        assertThatThrownBy(() -> service.updateProfile(
                account.id(),
                new UpdateProfileCommand(null, "UTC+7")
        )).isInstanceOfSatisfying(ApiException.class, error -> {
            assertThat(error.status().value()).isEqualTo(422);
            assertThat(error.code()).isEqualTo("INVALID_TIME_ZONE");
        });
    }

    @Test
    void getProfileRejectsLockedAccountEvenWithExistingToken() {
        UserAccount locked = new UserAccount(
                account.id(), account.email(), account.username(), account.passwordHash(),
                account.fullName(), account.timeZone(), account.role(), UserStatus.LOCKED,
                account.emailVerifiedAt(), account.createdAt(), account.updatedAt()
        );
        when(users.findById(account.id())).thenReturn(Optional.of(locked));

        assertThatThrownBy(() -> service.getProfile(account.id()))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status().value()).isEqualTo(403);
                    assertThat(error.code()).isEqualTo("ACCOUNT_UNAVAILABLE");
                });
    }
}
