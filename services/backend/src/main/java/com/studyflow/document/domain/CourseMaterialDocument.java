package com.studyflow.document.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Teacher-owned PDF metadata. File bytes remain in private object storage. */
@Entity
@Table(name = "documents", schema = "app")
public class CourseMaterialDocument {
    @Id private UUID id;
    @Column(name = "owner_id", nullable = false) private UUID ownerId;
    @Column(name = "owner_role", nullable = false) private String ownerRole;
    @Column(name = "document_scope", nullable = false) private String documentScope;
    @Column(name = "file_name", nullable = false) private String fileName;
    @Column(name = "display_name", nullable = false) private String displayName;
    @Column(name = "file_type", nullable = false) private String fileType;
    @Column(name = "mime_type", nullable = false) private String mimeType;
    @Column(name = "file_size", nullable = false) private long fileSize;
    @Column(name = "storage_key", nullable = false) private String storageKey;
    @Column(name = "processing_status", nullable = false) private String processingStatus;
    @Column(name = "document_version", nullable = false) private int documentVersion;
    @Column(name = "page_count", nullable = false) private int pageCount;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "deleted_at") private Instant deletedAt;

    protected CourseMaterialDocument() { }

    /**
     * Creates an immutable version-1 Course Material record.
     * Args: generated ID, owner, safe filename/title, fixed PDF metadata, private storage key,
     * byte/page counts and timestamp. Input: validated authenticated Teacher upload.
     * Output: new READY record. Errors: none. Side effect: none until repository save.
     */
    public CourseMaterialDocument(UUID id, UUID ownerId, String fileName, String displayName,
                                 String storageKey, long fileSize, int pageCount, Instant now) {
        this.id = id;
        this.ownerId = ownerId;
        this.ownerRole = "TEACHER";
        this.documentScope = "COURSE_MATERIAL";
        this.fileName = fileName;
        this.displayName = displayName;
        this.fileType = "PDF";
        this.mimeType = "application/pdf";
        this.fileSize = fileSize;
        this.storageKey = storageKey;
        this.processingStatus = "READY";
        this.documentVersion = 1;
        this.pageCount = pageCount;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getFileName() { return fileName; }
    public String getDisplayName() { return displayName; }
    public String getMimeType() { return mimeType; }
    public long getFileSize() { return fileSize; }
    public String getStorageKey() { return storageKey; }
    public String getProcessingStatus() { return processingStatus; }
    public int getDocumentVersion() { return documentVersion; }
    public int getPageCount() { return pageCount; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public void softDelete(Instant now) { deletedAt = now; updatedAt = now; }
}
