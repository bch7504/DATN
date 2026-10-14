package com.studyflow.enrollment.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "course_enrollments", schema = "app")
public class CourseEnrollment {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "course_offering_id", nullable = false)
    private UUID courseOfferingId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private EnrollmentStatus status;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "decided_by")
    private UUID decidedBy;

    @Column(name = "removed_at")
    private Instant removedAt;

    @Column(name = "decision_note", columnDefinition = "TEXT")
    private String decisionNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public CourseEnrollment() {
    }

    public CourseEnrollment(UUID id, UUID courseOfferingId, UUID studentId) {
        this.id = id != null ? id : UUID.randomUUID();
        this.courseOfferingId = courseOfferingId;
        this.studentId = studentId;
        this.status = EnrollmentStatus.PENDING;
        this.requestedAt = Instant.now();
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public boolean isApproved() {
        return this.status == EnrollmentStatus.APPROVED;
    }

    public void reapply() {
        this.status = EnrollmentStatus.PENDING;
        this.requestedAt = Instant.now();
        this.decidedAt = null;
        this.decidedBy = null;
        this.removedAt = null;
        this.decisionNote = null;
        this.updatedAt = Instant.now();
    }

    public void approve(UUID teacherId) {
        this.status = EnrollmentStatus.APPROVED;
        this.decidedAt = Instant.now();
        this.decidedBy = teacherId;
        this.updatedAt = Instant.now();
    }

    public void reject(UUID teacherId, String reason) {
        this.status = EnrollmentStatus.REJECTED;
        this.decidedAt = Instant.now();
        this.decidedBy = teacherId;
        this.decisionNote = reason;
        this.updatedAt = Instant.now();
    }

    public void remove(UUID teacherId, String reason) {
        this.status = EnrollmentStatus.REMOVED;
        this.removedAt = Instant.now();
        this.decidedBy = teacherId;
        this.decisionNote = reason;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getCourseOfferingId() {
        return courseOfferingId;
    }

    public void setCourseOfferingId(UUID courseOfferingId) {
        this.courseOfferingId = courseOfferingId;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public void setStudentId(UUID studentId) {
        this.studentId = studentId;
    }

    public EnrollmentStatus getStatus() {
        return status;
    }

    public void setStatus(EnrollmentStatus status) {
        this.status = status;
    }

    public Instant getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(Instant requestedAt) {
        this.requestedAt = requestedAt;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(Instant decidedAt) {
        this.decidedAt = decidedAt;
    }

    public UUID getDecidedBy() {
        return decidedBy;
    }

    public void setDecidedBy(UUID decidedBy) {
        this.decidedBy = decidedBy;
    }

    public Instant getRemovedAt() {
        return removedAt;
    }

    public void setRemovedAt(Instant removedAt) {
        this.removedAt = removedAt;
    }

    public String getDecisionNote() {
        return decisionNote;
    }

    public void setDecisionNote(String decisionNote) {
        this.decisionNote = decisionNote;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
