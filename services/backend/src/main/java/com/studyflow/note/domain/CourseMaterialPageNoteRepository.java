package com.studyflow.note.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence contract for Student-owned notes; every lookup includes the authenticated owner. */
public interface CourseMaterialPageNoteRepository extends JpaRepository<CourseMaterialPageNote, UUID> {
    Optional<CourseMaterialPageNote> findByStudentIdAndDocumentIdAndPageNumber(
            UUID studentId, UUID documentId, int pageNumber);
}
