package com.studyflow.document.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Teacher-owned logical collection for documents, Quiz drafts and assignments. */
@Entity
@Table(name = "teacher_resource_libraries", schema = "app")
public class TeacherResourceLibrary {
    @Id private UUID id;
    @Column(name = "teacher_id", nullable = false) private UUID teacherId;
    @Column(name = "subject_id") private UUID subjectId;
    @Column(nullable = false, length = 120) private String name;
    @Column(name = "library_type", nullable = false, length = 20) private String libraryType;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "deleted_at") private Instant deletedAt;

    protected TeacherResourceLibrary() { }

    /**
     * Args: IDs, normalized name, optional subject and current time.
     * Input: authenticated Teacher request; a subject ID creates SUBJECT, null creates PRIVATE.
     * Output: new active library. Errors: IllegalArgumentException for blank/oversized names.
     */
    public TeacherResourceLibrary(UUID id, UUID teacherId, String name, UUID subjectId, Instant now) {
        this(id, teacherId, name, subjectId == null ? "PRIVATE" : "SUBJECT", subjectId, now);
    }

    /**
     * Args: ID, Teacher ID and current time. Input: Java-owned fallback-library creation.
     * Output: active DEFAULT library named “Tài liệu tải lên”. Errors: none.
     */
    public static TeacherResourceLibrary defaultLibrary(UUID id, UUID teacherId, Instant now) {
        return new TeacherResourceLibrary(id, teacherId, "Tài liệu tải lên", "DEFAULT", null, now);
    }

    private TeacherResourceLibrary(UUID id, UUID teacherId, String name, String libraryType,
                                   UUID subjectId, Instant now) {
        if (name == null || name.isBlank() || name.strip().length() > 120) {
            throw new IllegalArgumentException("Library name must contain 1-120 characters.");
        }
        this.id = id;
        this.teacherId = teacherId;
        this.subjectId = subjectId;
        this.name = name.strip();
        this.libraryType = libraryType;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getTeacherId() { return teacherId; }
    public UUID getSubjectId() { return subjectId; }
    public String getName() { return name; }
    public String getLibraryType() { return libraryType; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public boolean isDefaultLibrary() { return "DEFAULT".equals(libraryType); }

    /** Args: current time. Output: void; hides only this collection. Errors: none. */
    public void softDelete(Instant now) { deletedAt = now; updatedAt = now; }
}
