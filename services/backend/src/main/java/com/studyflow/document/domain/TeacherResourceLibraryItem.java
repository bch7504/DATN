package com.studyflow.document.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Typed reference from a Teacher library to a Java-owned resource. */
@Entity
@Table(name = "teacher_resource_library_items", schema = "app")
public class TeacherResourceLibraryItem {
    @Id private UUID id;
    @Column(name = "library_id", nullable = false) private UUID libraryId;
    @Column(name = "item_type", nullable = false, length = 20) private String itemType;
    @Column(name = "item_id", nullable = false) private UUID itemId;
    @Column(name = "added_at", nullable = false) private Instant addedAt;

    protected TeacherResourceLibraryItem() { }

    /** Args: IDs, validated item type and time. Output: new reference. Errors: invalid item type. */
    public TeacherResourceLibraryItem(UUID id, UUID libraryId, String itemType, UUID itemId, Instant addedAt) {
        if (!java.util.Set.of("DOCUMENT", "QUIZ", "ASSIGNMENT").contains(itemType)) {
            throw new IllegalArgumentException("Unsupported library item type.");
        }
        this.id = id;
        this.libraryId = libraryId;
        this.itemType = itemType;
        this.itemId = itemId;
        this.addedAt = addedAt;
    }

    public UUID getId() { return id; }
    public UUID getLibraryId() { return libraryId; }
    public String getItemType() { return itemType; }
    public UUID getItemId() { return itemId; }
    public Instant getAddedAt() { return addedAt; }
}
