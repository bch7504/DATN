package com.studyflow.document.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence contract for Teacher-defined Slide Tutor support sources. */
public interface CourseMaterialTutorSourceLinkRepository
        extends JpaRepository<CourseMaterialTutorSourceLink, UUID> {
    List<CourseMaterialTutorSourceLink> findByCourseOfferingIdAndPrimaryDocumentIdOrderByCreatedAtAsc(
            UUID courseOfferingId, UUID primaryDocumentId);

    /** Args: primary slide UUID. Returns: its upload-time private attachments. Errors: persistence failures. */
    List<CourseMaterialTutorSourceLink> findByPrimaryDocumentIdAndCourseOfferingIdIsNullOrderByCreatedAtAsc(
            UUID primaryDocumentId);
}
