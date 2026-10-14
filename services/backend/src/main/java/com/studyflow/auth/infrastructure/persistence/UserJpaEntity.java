package com.studyflow.auth.infrastructure.persistence;

import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "users")
class UserJpaEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "time_zone", nullable = false, length = 64)
    private String timeZone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserStatus status;

    @Column(name = "email_verified_at", nullable = false)
    private Instant emailVerifiedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserJpaEntity() {
    }

    static UserJpaEntity fromDomain(UserAccount account) {
        UserJpaEntity entity = new UserJpaEntity();
        entity.id = account.id();
        entity.email = account.email();
        entity.username = account.username();
        entity.passwordHash = account.passwordHash();
        entity.fullName = account.fullName();
        entity.timeZone = account.timeZone();
        entity.role = account.role();
        entity.status = account.status();
        entity.emailVerifiedAt = account.emailVerifiedAt();
        entity.createdAt = account.createdAt();
        entity.updatedAt = account.updatedAt();
        return entity;
    }

    UserAccount toDomain() {
        return new UserAccount(
                id, email, username, passwordHash, fullName, timeZone, role, status,
                emailVerifiedAt, createdAt, updatedAt
        );
    }
}
