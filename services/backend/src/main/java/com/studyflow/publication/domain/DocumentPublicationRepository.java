package com.studyflow.publication.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence contract for Course Material publication state. */
public interface DocumentPublicationRepository extends JpaRepository<DocumentPublication, UUID> {
    List<DocumentPublication> findByDocumentIdAndStatus(UUID documentId, String status);
    List<DocumentPublication> findByCourseOfferingIdAndStatus(UUID offeringId, String status);
    Optional<DocumentPublication> findByDocumentIdAndCourseOfferingId(UUID documentId, UUID offeringId);
}
