package com.studyflow.assignment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assignment_submissions", schema = "app")
public class AssignmentSubmission {
    @Id private UUID id;
    @Column(name = "assignment_id", nullable = false) private UUID assignmentId;
    @Column(name = "student_id", nullable = false) private UUID studentId;
    @Column(name = "answer_text", columnDefinition = "TEXT") private String answerText;
    @Column(name = "submitted_at", nullable = false) private Instant submittedAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private SubmissionStatus status;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected AssignmentSubmission() {}

    public AssignmentSubmission(UUID id, UUID assignmentId, UUID studentId, String answerText,
                                Instant submittedAt, SubmissionStatus status) {
        this.id = id;
        this.assignmentId = assignmentId;
        this.studentId = studentId;
        this.answerText = answerText;
        this.submittedAt = submittedAt;
        this.status = status;
        this.createdAt = submittedAt;
        this.updatedAt = submittedAt;
    }

    /**
     * Args: optional replacement text, required submission instant and ON_TIME/LATE status.
     * Input: an existing Student-owned submission. Output: void; replaces the current answer and
     * retains only the newest submitted content and timestamp.
     * Errors: caller validates text/file presence and status before invoking this method.
     */
    public void resubmit(String text, Instant now, SubmissionStatus newStatus) {
        answerText = text;
        submittedAt = now;
        status = newStatus;
        updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getAssignmentId() { return assignmentId; }
    public UUID getStudentId() { return studentId; }
    public String getAnswerText() { return answerText; }
    public Instant getSubmittedAt() { return submittedAt; }
    public SubmissionStatus getStatus() { return status; }
}
