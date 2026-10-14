package com.studyflow.enrollment.domain;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Domain entity representing a student's enrollment request or approval in a Course Offering.
 *
 * Contract:
 * - id: String UUID
 * - courseOfferingId: String referencing CourseOffering
 * - studentId: String referencing User with role STUDENT
 * - status: PENDING, APPROVED, REJECTED, REMOVED
 * - requestedAt: Instant when student initiated the join request
 * - decidedAt: Instant when teacher approved/rejected
 * - decidedBy: String teacher ID who made the decision
 * - removedAt: Instant when student was removed from class (if applicable)
 * - decisionNote: Optional explanation for rejection or removal
 */
@Entity
@Table(name = "course_enrollments", schema = "app")
public class CourseEnrollment {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "course_offering_id", length = 36, nullable = false)
    private String courseOfferingId;

    @Column(name = "student_id", length = 36, nullable = false)
    private String studentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private EnrollmentStatus status;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "decided_by", length = 36)
    private String decidedBy;

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

    public CourseEnrollment(String id, String courseOfferingId, String studentId) {
        this.id = id;
        this.courseOfferingId = courseOfferingId;
        this.studentId = studentId;
        this.status = EnrollmentStatus.PENDING;
        this.requestedAt = Instant.now();
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * Approves this enrollment request.
     * Only valid from PENDING status.
     *
     * @param teacherId ID of the approving teacher
     * @throws IllegalStateException if current status is not PENDING
     */
    public void approve(String teacherId) {
        if (this.status != EnrollmentStatus.PENDING) {
            throw new IllegalStateException(
                    "Chỉ có thể duyệt đơn ở trạng thái PENDING, trạng thái hiện tại: " + this.status);
        }
        this.status = EnrollmentStatus.APPROVED;
        this.decidedAt = Instant.now();
        this.decidedBy = teacherId;
        this.decisionNote = null;
        this.updatedAt = Instant.now();
    }

    /**
     * Rejects this enrollment request.
     * Only valid from PENDING status.
     *
     * @param teacherId ID of the rejecting teacher
     * @param reason Optional rejection reason
     * @throws IllegalStateException if current status is not PENDING
     */
    public void reject(String teacherId, String reason) {
        if (this.status != EnrollmentStatus.PENDING) {
            throw new IllegalStateException(
                    "Chỉ có thể từ chối đơn ở trạng thái PENDING, trạng thái hiện tại: " + this.status);
        }
        this.status = EnrollmentStatus.REJECTED;
        this.decidedAt = Instant.now();
        this.decidedBy = teacherId;
        this.decisionNote = reason;
        this.updatedAt = Instant.now();
    }

    /**
     * Removes an approved student from the offering.
     * Only valid from APPROVED status.
     *
     * @param teacherId ID of the teacher performing removal
     * @param reason Optional removal note
     * @throws IllegalStateException if current status is not APPROVED
     */
    public void remove(String teacherId, String reason) {
        if (this.status != EnrollmentStatus.APPROVED) {
            throw new IllegalStateException(
                    "Chỉ có thể xóa sinh viên ở trạng thái APPROVED, trạng thái hiện tại: " + this.status);
        }
        this.status = EnrollmentStatus.REMOVED;
        this.removedAt = Instant.now();
        this.decidedBy = teacherId;
        this.decisionNote = reason;
        this.updatedAt = Instant.now();
    }

    /**
     * Allows student to re-apply after rejection or removal.
     *
     * @throws IllegalStateException if the enrollment is not REJECTED or REMOVED
     */
    public void reapply() {
        if (this.status != EnrollmentStatus.REJECTED && this.status != EnrollmentStatus.REMOVED) {
            throw new IllegalStateException(
                    "Chỉ có thể gửi lại yêu cầu khi trạng thái hiện tại là REJECTED hoặc REMOVED.");
        }
        this.status = EnrollmentStatus.PENDING;
        this.requestedAt = Instant.now();
        this.decidedAt = null;
        this.decidedBy = null;
        this.decisionNote = null;
        this.removedAt = null;
        this.updatedAt = Instant.now();
    }

    public boolean isApproved() {
        return this.status == EnrollmentStatus.APPROVED;
    }

    public boolean isPending() {
        return this.status == EnrollmentStatus.PENDING;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCourseOfferingId() {
        return courseOfferingId;
    }

    public void setCourseOfferingId(String courseOfferingId) {
        this.courseOfferingId = courseOfferingId;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
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

    public String getDecidedBy() {
        return decidedBy;
    }

    public void setDecidedBy(String decidedBy) {
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
