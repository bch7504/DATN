package com.studyflow.document.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence contract for Teacher-owned resource collections. */
public interface TeacherResourceLibraryRepository extends JpaRepository<TeacherResourceLibrary, UUID> {
    List<TeacherResourceLibrary> findByTeacherIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID teacherId);
    Optional<TeacherResourceLibrary> findByIdAndTeacherIdAndDeletedAtIsNull(UUID id, UUID teacherId);
    Optional<TeacherResourceLibrary> findByTeacherIdAndLibraryTypeAndDeletedAtIsNull(UUID teacherId, String libraryType);
}
