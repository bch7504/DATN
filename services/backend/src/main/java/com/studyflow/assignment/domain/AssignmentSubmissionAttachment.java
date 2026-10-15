package com.studyflow.assignment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assignment_submission_attachments", schema = "app")
public class AssignmentSubmissionAttachment {
    @Id private UUID id;
    @Column(name = "submission_id", nullable = false) private UUID submissionId;
    @Column(name = "original_file_name", nullable = false, length = 255) private String originalFileName;
    @Column(name = "content_type", nullable = false, length = 100) private String contentType;
    @Column(name = "size_bytes", nullable = false) private long sizeBytes;
    @Column(name = "storage_key", nullable = false, length = 500, unique = true) private String storageKey;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected AssignmentSubmissionAttachment() {}

    public AssignmentSubmissionAttachment(UUID id, UUID submissionId, String originalFileName,
                                         String contentType, long sizeBytes, String storageKey, Instant createdAt) {
        this.id = id;
        this.submissionId = submissionId;
        this.originalFileName = originalFileName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.storageKey = storageKey;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getSubmissionId() { return submissionId; }
    public String getOriginalFileName() { return originalFileName; }
    public String getContentType() { return contentType; }
    public long getSizeBytes() { return sizeBytes; }
    public String getStorageKey() { return storageKey; }
    public Instant getCreatedAt() { return createdAt; }
}
