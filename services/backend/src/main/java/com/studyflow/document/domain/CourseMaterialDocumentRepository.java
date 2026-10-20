package com.studyflow.document.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence contract for teacher-owned Course Material PDFs. */
public interface CourseMaterialDocumentRepository extends JpaRepository<CourseMaterialDocument, UUID> {
    List<CourseMaterialDocument> findByOwnerIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID ownerId);
    Optional<CourseMaterialDocument> findByIdAndDeletedAtIsNull(UUID id);
}
