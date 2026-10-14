package com.studyflow.courseoffering.application;

import java.util.UUID;

public record CreateCourseOfferingCommand(
        UUID subjectId,
        UUID semesterId,
        String code,
        String name
) {
}
