package com.studyflow.admin.application;

import com.studyflow.admin.api.AdminModels;
import com.studyflow.admin.infrastructure.AdminJdbcStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ValidationException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Synthetic valid and invalid Admin business-contract cases. */
class AdminServiceTest {
    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TARGET = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-10-29T10:00:00Z");
    private AdminJdbcStore store;
    private AdminService service;

    /** Args: none. Input: mock app store and fixed time. Output: service. Errors: setup failure. */
    @BeforeEach
    void setUp() {
        store = mock(AdminJdbcStore.class);
        service = new AdminService(store, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    /** Args: none. Input: valid code/name/credits. Output: normalized Subject and safe audit. Errors: assertion failure. */
    @Test
    void createsSubjectAndAuditsIt() {
        AdminModels.Subject result = service.createSubject(ADMIN,
                new AdminModels.SubjectInput("int101", "Lập trình", 3, null, null), "req_test");
        assertThat(result.code()).isEqualTo("INT101");
        assertThat(result.status()).isEqualTo("ACTIVE");
        verify(store).insertSubject(eq(result), eq(NOW));
        verify(store).audit(ADMIN, "SUBJECT_CREATED", "SUBJECT", result.id(), "SUCCESS", "req_test", NOW);
    }

    /** Args: none. Input: invalid zero credits. Output: 422, no insert or audit. Errors: assertion failure. */
    @Test
    void rejectsInvalidSubjectWithoutWriting() {
        assertThatThrownBy(() -> service.createSubject(ADMIN,
                new AdminModels.SubjectInput("INT101", "Lập trình", 0, null, null), "req_test"))
                .isInstanceOf(ValidationException.class);
        verify(store, never()).insertSubject(any(), any());
        verify(store, never()).audit(any(), any(), any(), any(), any(), any(), any());
    }

    /** Args: none. Input: active Teacher account being locked. Output: changed account, revoked sessions, audit. */
    @Test
    void lockingAccountRevokesRefreshAndOldRoleToken() {
        AdminModels.User active = new AdminModels.User(TARGET, "teacher@ptit.edu.vn", "teacher",
                "Teacher", "TEACHER", "ACTIVE", NOW);
        AdminModels.User locked = new AdminModels.User(TARGET, "teacher@ptit.edu.vn", "teacher",
                "Teacher", "TEACHER", "LOCKED", NOW);
        when(store.user(TARGET)).thenReturn(Optional.of(active), Optional.of(locked));
        AdminModels.User result = service.updateUser(ADMIN, TARGET,
                new AdminModels.UserUpdate(null, "LOCKED"), "req_test");
        assertThat(result.status()).isEqualTo("LOCKED");
        verify(store).updateUser(TARGET, "TEACHER", "LOCKED", NOW);
        verify(store).revokeRefreshTokens(TARGET, NOW);
        verify(store).audit(ADMIN, "USER_UPDATED", "USER", TARGET, "SUCCESS", "req_test", NOW);
    }

    /** Args: none. Input: target is current Admin. Output: conflict and no mutation. Errors: assertion failure. */
    @Test
    void cannotLockOwnAdminAccount() {
        when(store.user(ADMIN)).thenReturn(Optional.of(new AdminModels.User(ADMIN, "a@ptit.edu.vn", "a", "A",
                "ADMIN", "ACTIVE", NOW)));
        assertThatThrownBy(() -> service.updateUser(ADMIN, ADMIN,
                new AdminModels.UserUpdate(null, "LOCKED"), "req_test"))
                .isInstanceOf(ApiException.class).hasMessageContaining("Không thể tự đổi");
        verify(store, never()).updateUser(any(), any(), any(), any());
    }

    /** Args: none. Input: invalid null feedback status. Output: 422 instead of NPE. Errors: assertion failure. */
    @Test
    void rejectsMissingFeedbackStatus() {
        when(store.feedback(TARGET)).thenReturn(Optional.of(new AdminModels.Feedback(TARGET, ADMIN, "BUG", "x", "y",
                "OPEN", null, NOW, NOW)));
        assertThatThrownBy(() -> service.updateFeedback(ADMIN, TARGET,
                new AdminModels.FeedbackUpdate(null, null), "req_test"))
                .isInstanceOf(ValidationException.class);
        verify(store, never()).updateFeedback(any(), any(), any(), any(), any());
    }
}
