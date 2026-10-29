package com.studyflow.document.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Public metadata contract; private object keys and storage URLs are excluded. */
public record TeacherDocumentResponse(
        UUID id, String title, String fileName, String fileType, String materialType, long fileSize,
        String status, int totalPages, List<PublishedOffering> publishedOfferings, Instant createdAt) {
    public record PublishedOffering(UUID offeringId, String offeringCode, String offeringName, Instant publishedAt) { }
}
