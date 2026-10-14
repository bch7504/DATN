package com.studyflow.academic.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Domain entity representing an academic semester (học kỳ).
 *
 * Contract:
 * - id: unique semester identifier (e.g. sem_2026_1)
 * - code: semester code (e.g. 2026_1)
 * - name: semester display name (e.g. Học kỳ 1 · 2026 - 2027)
 * - academicYear: school year (e.g. 2026-2027)
 * - startDate / endDate: calendar dates (endDate >= startDate)
 * - status: UPCOMING, ACTIVE, CLOSED
 * - offeringCreationEnabled: boolean flag permitting course offering creation
 */
@Entity
@Table(name = "semesters", schema = "app")
public class Semester {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "code", length = 50, nullable = false, unique = true)
    private String code;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "academic_year", length = 50, nullable = false)
    private String academicYear;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private SemesterStatus status;

    @Column(name = "offering_creation_enabled", nullable = false)
    private boolean offeringCreationEnabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Semester() {
    }

    public Semester(String id, String code, String name, String academicYear,
                    LocalDate startDate, LocalDate endDate, SemesterStatus status, boolean offeringCreationEnabled) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.academicYear = academicYear;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.offeringCreationEnabled = offeringCreationEnabled;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public boolean canCreateCourseOffering() {
        return this.status == SemesterStatus.ACTIVE && this.offeringCreationEnabled;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(String academicYear) {
        this.academicYear = academicYear;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public SemesterStatus getStatus() {
        return status;
    }

    public void setStatus(SemesterStatus status) {
        this.status = status;
    }

    public boolean isOfferingCreationEnabled() {
        return offeringCreationEnabled;
    }

    public void setOfferingCreationEnabled(boolean offeringCreationEnabled) {
        this.offeringCreationEnabled = offeringCreationEnabled;
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
