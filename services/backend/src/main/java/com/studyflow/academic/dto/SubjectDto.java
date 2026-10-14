package com.studyflow.academic.dto;

import com.studyflow.academic.domain.Subject;

import java.util.UUID;

public record SubjectDto(
        UUID id,
        String code,
        String name,
        int credits,
        String description,
        String status
) {
    public static SubjectDto from(Subject subject) {
        return new SubjectDto(
                subject.getId(),
                subject.getCode(),
                subject.getName(),
                subject.getCredits(),
                subject.getDescription(),
                subject.getStatus()
        );
    }

    public static SubjectDto fromEntity(Subject subject) {
        return from(subject);
    }
}
