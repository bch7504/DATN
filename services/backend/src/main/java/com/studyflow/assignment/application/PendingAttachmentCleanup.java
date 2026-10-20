package com.studyflow.assignment.application;

import java.util.UUID;

/**
 * Args: required queue UUID, opaque private storage key and nonnegative retry count.
 * Input: one locked, due cleanup row. Output: immutable deletion request; no side effects.
 * Errors: malformed database values are rejected by the database constraint or row mapper.
 */
public record PendingAttachmentCleanup(UUID id, String storageKey, int attemptCount) {
}
