package com.studyflow.document.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence contract for typed resources placed in a Teacher library. */
public interface TeacherResourceLibraryItemRepository extends JpaRepository<TeacherResourceLibraryItem, UUID> {
    List<TeacherResourceLibraryItem> findByLibraryIdOrderByAddedAtDesc(UUID libraryId);
    Optional<TeacherResourceLibraryItem> findByLibraryIdAndItemTypeAndItemId(UUID libraryId, String itemType, UUID itemId);

    /**
     * Args: exact resource type and ID. Input: references to one Java-owned resource.
     * Output: number of removed library links. Errors: persistence failure.
     */
    long deleteByItemTypeAndItemId(String itemType, UUID itemId);

    /** Args: complete reference fields. Output: 1 when inserted, 0 for an existing identical link. Errors: persistence failure. */
    @Modifying
    @Query(value = """
            INSERT INTO app.teacher_resource_library_items (id, library_id, item_type, item_id, added_at)
            VALUES (:id, :libraryId, :itemType, :itemId, :addedAt)
            ON CONFLICT (library_id, item_type, item_id) DO NOTHING
            """, nativeQuery = true)
    int insertIgnore(@Param("id") UUID id, @Param("libraryId") UUID libraryId,
                     @Param("itemType") String itemType, @Param("itemId") UUID itemId,
                     @Param("addedAt") java.time.Instant addedAt);
}
