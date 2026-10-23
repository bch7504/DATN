package com.studyflow.review.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "quiz_sources", schema = "app")
public class QuizSource {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "document_version", nullable = false)
    private int documentVersion;

    @Column(name = "page_start")
    private Integer pageStart;

    @Column(name = "page_end")
    private Integer pageEnd;

    @Column(name = "source_type", length = 50, nullable = false)
    private String sourceType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected QuizSource() {}

    public QuizSource(
            UUID id,
            UUID quizId,
            UUID documentId,
            int documentVersion,
            Integer pageStart,
            Integer pageEnd,
            String sourceType,
            Instant createdAt
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.quizId = Objects.requireNonNull(quizId, "quizId must not be null");
        this.documentId = Objects.requireNonNull(documentId, "documentId must not be null");
        this.documentVersion = documentVersion;
        this.pageStart = pageStart;
        this.pageEnd = pageEnd;
        this.sourceType = Objects.requireNonNull(sourceType, "sourceType must not be null");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
    }

    public UUID getId() { return id; }
    public UUID getQuizId() { return quizId; }
    public UUID getDocumentId() { return documentId; }
    public int getDocumentVersion() { return documentVersion; }
    public Integer getPageStart() { return pageStart; }
    public Integer getPageEnd() { return pageEnd; }
    public String getSourceType() { return sourceType; }
    public Instant getCreatedAt() { return createdAt; }
}
