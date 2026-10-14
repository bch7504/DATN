package com.studyflow.courseoffering.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "course_offerings", schema = "app")
public class CourseOffering {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "semester_id", nullable = false)
    private UUID semesterId;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

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

    public CourseOffering(UUID id, UUID subjectId, UUID semesterId, UUID teacherId,
                          String code, String name, String joinCodeHash, String joinCodeHint) {
        this.id = id != null ? id : UUID.randomUUID();
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

    public boolean isOwnedBy(UUID teacherId) {
        return this.teacherId != null && this.teacherId.equals(teacherId);
    }

    public void updateJoinCode(String hash, String hint) {
        ensureActive("đổi mã tham gia");
        this.joinCodeHash = hash;
        this.joinCodeHint = hint;
        this.updatedAt = Instant.now();
    }

    public void toggleJoinCode(boolean enabled) {
        ensureActive("bật/tắt mã tham gia");
        this.joinEnabled = enabled;
        this.updatedAt = Instant.now();
    }

    public void archive() {
        ensureActive("lưu trữ lớp");
        this.status = CourseOfferingStatus.ARCHIVED;
        this.archivedAt = Instant.now();
        this.joinEnabled = false;
        this.updatedAt = Instant.now();
    }

    public void lock() {
        ensureActive("khóa lớp");
        this.status = CourseOfferingStatus.LOCKED;
        this.lockedAt = Instant.now();
        this.joinEnabled = false;
        this.updatedAt = Instant.now();
    }

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

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(UUID subjectId) {
        this.subjectId = subjectId;
    }

    public UUID getSemesterId() {
        return semesterId;
    }

    public void setSemesterId(UUID semesterId) {
        this.semesterId = semesterId;
    }

    public UUID getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(UUID teacherId) {
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
