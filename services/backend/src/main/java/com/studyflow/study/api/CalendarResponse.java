package com.studyflow.study.api;

import java.time.Instant;
import java.util.List;

public record CalendarResponse(
        Instant from,
        Instant to,
        List<StudyPlanItemResponse> items
) {
}
