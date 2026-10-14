package com.studyflow.auth.infrastructure.persistence;

import com.studyflow.auth.domain.RegistrationChallenge;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "email_verification_challenges")
class RegistrationChallengeJpaEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "code_hash", nullable = false, length = 100)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "resend_available_at", nullable = false)
    private Instant resendAvailableAt;

    @Column(name = "attempts_remaining", nullable = false)
    private int attemptsRemaining;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected RegistrationChallengeJpaEntity() {
    }

    static RegistrationChallengeJpaEntity fromDomain(RegistrationChallenge challenge) {
        RegistrationChallengeJpaEntity entity = new RegistrationChallengeJpaEntity();
        entity.id = challenge.id();
        entity.email = challenge.email();
        entity.displayName = challenge.displayName();
        entity.passwordHash = challenge.passwordHash();
        entity.codeHash = challenge.codeHash();
        entity.expiresAt = challenge.expiresAt();
        entity.resendAvailableAt = challenge.resendAvailableAt();
        entity.attemptsRemaining = challenge.attemptsRemaining();
        entity.consumedAt = challenge.consumedAt();
        entity.createdAt = challenge.createdAt();
        entity.updatedAt = challenge.updatedAt();
        return entity;
    }

    RegistrationChallenge toDomain() {
        return new RegistrationChallenge(
                id, email, displayName, passwordHash, codeHash, expiresAt,
                resendAvailableAt, attemptsRemaining, consumedAt, createdAt, updatedAt
        );
    }
}
