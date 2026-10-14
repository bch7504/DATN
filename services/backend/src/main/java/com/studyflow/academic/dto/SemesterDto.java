package com.studyflow.academic.dto;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterStatus;

import java.time.LocalDate;
import java.util.UUID;

public record SemesterDto(
        UUID id,
        String code,
        String name,
        String academicYear,
        LocalDate startDate,
        LocalDate endDate,
        SemesterStatus status,
        boolean offeringCreationEnabled
) {
    public static SemesterDto from(Semester semester) {
        return new SemesterDto(
                semester.getId(),
                semester.getCode(),
                semester.getName(),
                semester.getAcademicYear(),
                semester.getStartDate(),
                semester.getEndDate(),
                semester.getStatus(),
                semester.isOfferingCreationEnabled()
        );
    }

    public static SemesterDto fromEntity(Semester semester) {
        return from(semester);
    }
}
