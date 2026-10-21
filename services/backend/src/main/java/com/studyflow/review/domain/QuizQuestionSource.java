package com.studyflow.review.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "quiz_question_sources", schema = "app")
public class QuizQuestionSource {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "page_number", nullable = false)
    private int pageNumber;

    @Column(name = "excerpt", columnDefinition = "TEXT")
    private String excerpt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected QuizQuestionSource() {}

    public QuizQuestionSource(
            UUID id,
            UUID questionId,
            UUID documentId,
            int pageNumber,
            String excerpt,
            Instant createdAt
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.questionId = Objects.requireNonNull(questionId, "questionId must not be null");
        this.documentId = Objects.requireNonNull(documentId, "documentId must not be null");
        if (pageNumber <= 0) {
            throw new IllegalArgumentException("pageNumber must be positive");
        }
        this.pageNumber = pageNumber;
        this.excerpt = excerpt;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
    }

    public UUID getId() { return id; }
    public UUID getQuestionId() { return questionId; }
    public UUID getDocumentId() { return documentId; }
    public int getPageNumber() { return pageNumber; }
    public String getExcerpt() { return excerpt; }
    public Instant getCreatedAt() { return createdAt; }
}
