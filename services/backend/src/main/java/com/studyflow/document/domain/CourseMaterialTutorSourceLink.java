package com.studyflow.document.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Teacher-defined supporting PDF for one primary slide inside one Course Offering. */
@Entity
@Table(name = "course_material_tutor_sources", schema = "app")
public class CourseMaterialTutorSourceLink {
    @Id private UUID id;
    @Column(name = "course_offering_id", nullable = false) private UUID courseOfferingId;
    @Column(name = "primary_document_id", nullable = false) private UUID primaryDocumentId;
    @Column(name = "supporting_document_id", nullable = false) private UUID supportingDocumentId;
    @Column(name = "created_by", nullable = false) private UUID createdBy;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected CourseMaterialTutorSourceLink() { }

    /**
     * Args: generated ID, offering, primary slide, supporting PDF, Teacher and timestamp.
     * Input: values already authorized and type-checked by the application service.
     * Output: one immutable link entity. Errors: IllegalArgumentException for null/self-link input.
     */
    public CourseMaterialTutorSourceLink(UUID id, UUID courseOfferingId, UUID primaryDocumentId,
                                         UUID supportingDocumentId, UUID createdBy, Instant createdAt) {
        if (id == null || courseOfferingId == null || primaryDocumentId == null
                || supportingDocumentId == null || createdBy == null || createdAt == null) {
            throw new IllegalArgumentException("Tutor source link fields are required");
        }
        if (primaryDocumentId.equals(supportingDocumentId)) {
            throw new IllegalArgumentException("Primary and supporting documents must differ");
        }
        this.id = id;
        this.courseOfferingId = courseOfferingId;
        this.primaryDocumentId = primaryDocumentId;
        this.supportingDocumentId = supportingDocumentId;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getCourseOfferingId() { return courseOfferingId; }
    public UUID getPrimaryDocumentId() { return primaryDocumentId; }
    public UUID getSupportingDocumentId() { return supportingDocumentId; }
}
