package com.studyflow.note.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

/** Student-owned note attached to exactly one authorized Course Material slide page. */
@Entity
@Table(name = "course_material_page_notes", schema = "app",
        uniqueConstraints = @UniqueConstraint(name = "uq_course_material_page_note_owner_page",
                columnNames = {"student_id", "document_id", "page_number"}))
public class CourseMaterialPageNote {
    @Id private UUID id;
    @Column(name = "student_id", nullable = false) private UUID studentId;
    @Column(name = "document_id", nullable = false) private UUID documentId;
    @Column(name = "page_number", nullable = false) private int pageNumber;
    @Column(name = "content", nullable = false, length = 5000) private String content;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected CourseMaterialPageNote() { }

    /** Args: IDs, positive page, validated content and timestamp. Output: new owner-scoped note. Errors: invalid arguments. */
    public CourseMaterialPageNote(UUID id, UUID studentId, UUID documentId, int pageNumber,
                                  String content, Instant now) {
        if (id == null || studentId == null || documentId == null || now == null) {
            throw new IllegalArgumentException("note identity and time are required");
        }
        if (pageNumber < 1) throw new IllegalArgumentException("pageNumber must be positive");
        this.id = id;
        this.studentId = studentId;
        this.documentId = documentId;
        this.pageNumber = pageNumber;
        replaceContent(content, now);
        this.createdAt = now;
    }

    /** Args: validated content and time. Output: void; replaces only this Student's note. Errors: invalid content/time. */
    public void replaceContent(String content, Instant now) {
        if (content == null || content.length() > 5000 || now == null) {
            throw new IllegalArgumentException("note content is invalid");
        }
        this.content = content;
        this.updatedAt = now;
    }

    public UUID getStudentId() { return studentId; }
    public UUID getDocumentId() { return documentId; }
    public int getPageNumber() { return pageNumber; }
    public String getContent() { return content; }
    public Instant getUpdatedAt() { return updatedAt; }
}
