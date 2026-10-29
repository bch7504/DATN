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
    @Column(name = "material_type") private String materialType;
    @Column(name = "file_name", nullable = false) private String fileName;
    @Column(name = "display_name", nullable = false) private String displayName;
    @Column(name = "file_type", nullable = false) private String fileType;
    @Column(name = "mime_type", nullable = false) private String mimeType;
    @Column(name = "file_size", nullable = false) private long fileSize;
    @Column(name = "storage_key", nullable = false) private String storageKey;
    @Column(name = "processing_status", nullable = false) private String processingStatus;
    @Column(name = "document_version", nullable = false) private int documentVersion;
    @Column(name = "page_count", nullable = false) private int pageCount;
    @Column(name = "ai_job_id") private UUID aiJobId;
    @Column(name = "ai_error_code", length = 80) private String aiErrorCode;
    @Column(name = "indexed_at") private Instant indexedAt;
    @Column(name = "sha256", length = 64) private String sha256;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "deleted_at") private Instant deletedAt;

    protected CourseMaterialDocument() { }

    /**
     * Creates an immutable version-1 Course Material record.
     * Args: generated ID, owner, safe filename/title, fixed PDF metadata, private storage key,
     * byte/page counts and timestamp. Input: validated authenticated Teacher upload.
     * Output: new PENDING_PROCESSING record. Errors: none. Side effect: none until repository save.
     */
    public CourseMaterialDocument(UUID id, UUID ownerId, String fileName, String displayName,
                                 String storageKey, long fileSize, int pageCount, Instant now) {
        this(id, ownerId, fileName, displayName, storageKey, fileSize, pageCount,
                CourseMaterialType.SLIDE_PDF, now);
    }

    /**
     * Args: immutable file metadata, required Course Material behavior and timestamp.
     * Input: validated Teacher-owned text-layer PDF.
     * Output: SLIDE_PDF pending AI indexing or REFERENCE_PDF immediately READY for download.
     * Errors: IllegalArgumentException for a missing material type.
     */
    public CourseMaterialDocument(UUID id, UUID ownerId, String fileName, String displayName,
                                  String storageKey, long fileSize, int pageCount,
                                  CourseMaterialType materialType, Instant now) {
        if (materialType == null) throw new IllegalArgumentException("materialType is required");
        this.id = id;
        this.ownerId = ownerId;
        this.ownerRole = "TEACHER";
        this.documentScope = "COURSE_MATERIAL";
        this.materialType = materialType.name();
        this.fileName = fileName;
        this.displayName = displayName;
        this.fileType = "PDF";
        this.mimeType = "application/pdf";
        this.fileSize = fileSize;
        this.storageKey = storageKey;
        this.processingStatus = materialType == CourseMaterialType.SLIDE_PDF
                ? "PENDING_PROCESSING"
                : "READY";
        this.documentVersion = 1;
        this.pageCount = pageCount;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /**
     * Creates a Student-owned Personal PDF pending Python indexing.
     * Args: IDs, safe file metadata, private object key, byte/page counts, SHA-256 and timestamp.
     * Input: validated text-layer PDF owned by the authenticated Student.
     * Output: version-1 PERSONAL document. Errors: none; persistence constraints validate required data.
     */
    public static CourseMaterialDocument personal(
            UUID id,
            UUID ownerId,
            String fileName,
            String displayName,
            String storageKey,
            long fileSize,
            int pageCount,
            String sha256,
            Instant now
    ) {
        CourseMaterialDocument document = new CourseMaterialDocument(
                id, ownerId, fileName, displayName, storageKey, fileSize, pageCount, now);
        document.ownerRole = "STUDENT";
        document.documentScope = "PERSONAL";
        document.materialType = null;
        document.processingStatus = "PENDING_PROCESSING";
        document.sha256 = sha256;
        return document;
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
    public UUID getAiJobId() { return aiJobId; }
    public String getAiErrorCode() { return aiErrorCode; }
    public Instant getIndexedAt() { return indexedAt; }
    public String getSha256() { return sha256; }
    public String getDocumentScope() { return documentScope; }
    public String getMaterialType() { return materialType; }
    public boolean isSlidePdf() { return CourseMaterialType.SLIDE_PDF.name().equals(materialType); }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDeletedAt() { return deletedAt; }

    /** Args: Python job identity and current time. Output: void; marks PROCESSING. Errors: invalid null job. */
    public void markProcessing(UUID jobId, Instant now) {
        if (jobId == null) throw new IllegalArgumentException("jobId is required");
        processingStatus = "PROCESSING";
        aiJobId = jobId;
        aiErrorCode = null;
        updatedAt = now;
    }

    /** Args: positive extracted page count and time. Output: void; marks READY. Errors: invalid page count. */
    public void markReady(int extractedPageCount, Instant now) {
        if (extractedPageCount < 1) throw new IllegalArgumentException("pageCount must be positive");
        processingStatus = "READY";
        pageCount = extractedPageCount;
        aiErrorCode = null;
        indexedAt = now;
        updatedAt = now;
    }

    /** Args: safe nonblank error code and current time. Output: void; marks FAILED without raw provider detail. */
    public void markFailed(String errorCode, Instant now) {
        if (errorCode == null || errorCode.isBlank() || errorCode.length() > 80) {
            throw new IllegalArgumentException("errorCode is invalid");
        }
        processingStatus = "FAILED";
        aiErrorCode = errorCode;
        updatedAt = now;
    }

    /** Args: current time. Output: void; marks DELETING before vector/object cleanup. */
    public void markDeleting(Instant now) {
        processingStatus = "DELETING";
        updatedAt = now;
    }

    public void softDelete(Instant now) { deletedAt = now; updatedAt = now; }
}
