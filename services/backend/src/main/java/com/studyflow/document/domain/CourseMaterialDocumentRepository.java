package com.studyflow.document.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence contract for teacher-owned Course Material PDFs. */
public interface CourseMaterialDocumentRepository extends JpaRepository<CourseMaterialDocument, UUID> {
    List<CourseMaterialDocument> findByOwnerIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID ownerId);
    List<CourseMaterialDocument> findByOwnerIdAndDocumentScopeAndDeletedAtIsNullOrderByCreatedAtDesc(
            UUID ownerId,
            String documentScope
    );
    Optional<CourseMaterialDocument> findByIdAndDeletedAtIsNull(UUID id);
    Optional<CourseMaterialDocument> findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(
            UUID id,
            UUID ownerId,
            String documentScope
    );
    boolean existsByOwnerIdAndDocumentScopeAndSha256AndDeletedAtIsNull(
            UUID ownerId,
            String documentScope,
            String sha256
    );
    List<CourseMaterialDocument> findTop20ByProcessingStatusAndDeletedAtIsNullOrderByUpdatedAtAsc(
            String processingStatus
    );
}
