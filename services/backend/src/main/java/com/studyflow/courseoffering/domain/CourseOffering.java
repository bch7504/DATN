package com.studyflow.courseoffering.domain;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Domain entity representing a Course Offering (Lớp học phần) owned by a Teacher.
 *
 * Contract:
 * - id: String UUID
 * - subjectId: String referencing Subject
 * - semesterId: String referencing Semester
 * - teacherId: String referencing User with role TEACHER
 * - code: String course section code (e.g. DBI-01)
 * - name: String course display name (e.g. Cơ sở dữ liệu - Nhóm 01)
 * - joinCodeHash: String SHA-256 hex digest for lookup
 * - joinCodeHint: String last 3-4 characters of the raw join code
 * - joinEnabled: boolean flag controlling join requests
 * - status: ACTIVE, LOCKED, ARCHIVED
 */
@Entity
@Table(name = "course_offerings", schema = "app")
public class CourseOffering {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "subject_id", length = 36, nullable = false)
    private String subjectId;

    @Column(name = "semester_id", length = 36, nullable = false)
    private String semesterId;

    @Column(name = "teacher_id", length = 36, nullable = false)
    private String teacherId;

    @Column(name = "code", length = 50, nullable = false)
    private String code;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "join_code_hash", length = 64, unique = true)
    private String joinCodeHash;

    @Column(name = "join_code_hint", length = 4)
    private String joinCodeHint;

    @Column(name = "join_enabled", nullable = false)
    private boolean joinEnabled;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private CourseOfferingStatus status;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "locked_at")
    private Instant lockedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public CourseOffering() {
    }

    public CourseOffering(String id, String subjectId, String semesterId, String teacherId,
                          String code, String name, String joinCodeHash, String joinCodeHint) {
        this.id = id;
        this.subjectId = subjectId;
        this.semesterId = semesterId;
        this.teacherId = teacherId;
        this.code = code;
        this.name = name;
        this.joinCodeHash = joinCodeHash;
        this.joinCodeHint = joinCodeHint;
        this.joinEnabled = true;
        this.status = CourseOfferingStatus.ACTIVE;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * Domain method to update Join Code hash and hint.
     *
     * @param hash SHA-256 hex string
     * @param hint Last 4 characters of raw code
     */
    public void updateJoinCode(String hash, String hint) {
        ensureActive("đổi mã tham gia");
        this.joinCodeHash = hash;
        this.joinCodeHint = hint;
        this.updatedAt = Instant.now();
    }

    /**
     * Domain method to toggle join availability.
     *
     * @param enabled boolean state
     */
    public void toggleJoinCode(boolean enabled) {
        ensureActive("bật/tắt mã tham gia");
        this.joinEnabled = enabled;
        this.updatedAt = Instant.now();
    }

    /**
     * Domain method to archive the offering.
     */
    public void archive() {
        ensureActive("lưu trữ lớp");
        this.status = CourseOfferingStatus.ARCHIVED;
        this.archivedAt = Instant.now();
        this.joinEnabled = false;
        this.updatedAt = Instant.now();
    }

    /**
     * Domain method to lock the offering.
     */
    public void lock() {
        ensureActive("khóa lớp");
        this.status = CourseOfferingStatus.LOCKED;
        this.lockedAt = Instant.now();
        this.joinEnabled = false;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates mutable teacher-facing metadata while the offering is ACTIVE.
     *
     * @param code normalized non-blank course section code
     * @param name trimmed non-blank display name
     * @throws IllegalStateException if the offering is not ACTIVE
     * @throws IllegalArgumentException if either value is blank
     */
    public void updateMetadata(String code, String name) {
        ensureActive("cập nhật thông tin lớp");
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Mã lớp không được để trống.");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Tên lớp không được để trống.");
        }
        this.code = code;
        this.name = name;
        this.updatedAt = Instant.now();
    }

    private void ensureActive(String operation) {
        if (this.status != CourseOfferingStatus.ACTIVE) {
            throw new IllegalStateException(
                    "Không thể " + operation + " khi lớp đang ở trạng thái " + this.status + ".");
        }
    }

    /**
     * Checks if this offering allows student join requests.
     *
     * @return true if status is ACTIVE and joinEnabled is true
     */
    public boolean isJoinable() {
        return this.status == CourseOfferingStatus.ACTIVE && this.joinEnabled;
    }

    /**
     * Checks if the given teacher is the owner of this offering.
     *
     * @param teacherId teacher ID
     * @return true if owned by teacher
     */
    public boolean isOwnedBy(String teacherId) {
        return this.teacherId != null && this.teacherId.equals(teacherId);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
    }

    public String getSemesterId() {
        return semesterId;
    }

    public void setSemesterId(String semesterId) {
        this.semesterId = semesterId;
    }

    public String getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(String teacherId) {
        this.teacherId = teacherId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getJoinCodeHash() {
        return joinCodeHash;
    }

    public void setJoinCodeHash(String joinCodeHash) {
        this.joinCodeHash = joinCodeHash;
    }

    public String getJoinCodeHint() {
        return joinCodeHint;
    }

    public void setJoinCodeHint(String joinCodeHint) {
        this.joinCodeHint = joinCodeHint;
    }

    public boolean isJoinEnabled() {
        return joinEnabled;
    }

    public void setJoinEnabled(boolean joinEnabled) {
        this.joinEnabled = joinEnabled;
    }

    public CourseOfferingStatus getStatus() {
        return status;
    }

    public void setStatus(CourseOfferingStatus status) {
        this.status = status;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }

    public void setArchivedAt(Instant archivedAt) {
        this.archivedAt = archivedAt;
    }

    public Instant getLockedAt() {
        return lockedAt;
    }

    public void setLockedAt(Instant lockedAt) {
        this.lockedAt = lockedAt;
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
