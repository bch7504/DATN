package com.studyflow.academic.dto;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterStatus;

import java.time.LocalDate;

public class SemesterDto {

    private String id;
    private String code;
    private String name;
    private String academicYear;
    private LocalDate startDate;
    private LocalDate endDate;
    private SemesterStatus status;
    private boolean offeringCreationEnabled;

    public SemesterDto() {
    }

    public SemesterDto(String id, String code, String name, String academicYear,
                       LocalDate startDate, LocalDate endDate, SemesterStatus status, boolean offeringCreationEnabled) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.academicYear = academicYear;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.offeringCreationEnabled = offeringCreationEnabled;
    }

    public static SemesterDto fromEntity(Semester s) {
        if (s == null) {
            return null;
        }
        return new SemesterDto(
                s.getId(),
                s.getCode(),
                s.getName(),
                s.getAcademicYear(),
                s.getStartDate(),
                s.getEndDate(),
                s.getStatus(),
                s.isOfferingCreationEnabled()
        );
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
}
