package com.studyflow.assignment.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Hibernate mapping for schema validation and isolated create-drop integration tests. */
@Entity
@Table(name = "assignment_attachment_cleanup_queue", schema = "app")
class AttachmentCleanupQueueJpaEntity {
    @Id
    private UUID id;

    @Column(name = "storage_key", nullable = false, length = 500, unique = true)
    private String storageKey;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** Args: none. Input: Hibernate entity instantiation. Output: empty mapped entity; no side effects or errors. */
    protected AttachmentCleanupQueueJpaEntity() {
    }
}
