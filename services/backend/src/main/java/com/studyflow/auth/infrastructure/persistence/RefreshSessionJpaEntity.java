package com.studyflow.auth.infrastructure.persistence;

import com.studyflow.auth.domain.RefreshSession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "refresh_tokens")
class RefreshSessionJpaEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "replaced_by_id")
    private UUID replacedById;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RefreshSessionJpaEntity() {
    }

    static RefreshSessionJpaEntity fromDomain(RefreshSession session) {
        RefreshSessionJpaEntity entity = new RefreshSessionJpaEntity();
        entity.id = session.id();
        entity.userId = session.userId();
        entity.tokenHash = session.tokenHash();
        entity.expiresAt = session.expiresAt();
        entity.revokedAt = session.revokedAt();
        entity.replacedById = session.replacedById();
        entity.createdAt = session.createdAt();
        return entity;
    }

    RefreshSession toDomain() {
        return new RefreshSession(id, userId, tokenHash, expiresAt, revokedAt, replacedById, createdAt);
    }
}
