package com.studyflow.publication.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Visibility of one Course Material PDF in one Course Offering. */
@Entity
@Table(name = "document_publications", schema = "app")
public class DocumentPublication {
    @Id private UUID id;
    @Column(name = "document_id", nullable = false) private UUID documentId;
    @Column(name = "course_offering_id", nullable = false) private UUID courseOfferingId;
    @Column(name = "published_by", nullable = false) private UUID publishedBy;
    @Column(nullable = false) private String status;
    @Column(name = "published_at", nullable = false) private Instant publishedAt;
    @Column(name = "revoked_at") private Instant revokedAt;

    protected DocumentPublication() { }

    /**
     * Creates/re-activates publication state.
     * Args: publication/document/offering/teacher IDs and current time. Input: ownership already
     * validated by application service. Output: publication in PUBLISHED state. Errors: none.
     * Side effect: mutates this entity only.
     */
    public DocumentPublication(UUID id, UUID documentId, UUID courseOfferingId, UUID publishedBy, Instant now) {
        this.id = id;
        this.documentId = documentId;
        this.courseOfferingId = courseOfferingId;
        this.publishedBy = publishedBy;
        publish(publishedBy, now);
    }

    public void publish(UUID teacherId, Instant now) {
        this.publishedBy = teacherId;
        this.status = "PUBLISHED";
        this.publishedAt = now;
        this.revokedAt = null;
    }
    public void revoke(Instant now) { this.status = "REVOKED"; this.revokedAt = now; }
    public UUID getId() { return id; }
    public UUID getDocumentId() { return documentId; }
    public UUID getCourseOfferingId() { return courseOfferingId; }
    public String getStatus() { return status; }
    public Instant getPublishedAt() { return publishedAt; }
}
