package com.studyflow.document.api;

import java.time.Instant;
import java.util.UUID;

/** Safe Student-facing metadata for one owner-scoped Personal PDF. */
public record PersonalDocumentResponse(
        UUID id,
        String title,
        String fileName,
        long fileSize,
        int pageCount,
        String status,
        String sha256,
        Instant uploadedAt,
        String errorReason
) { }
