package com.studyflow.progress.application;

import com.studyflow.progress.domain.EventType;
import java.util.UUID;

/**
 * Command to record a valid learning event.
 *
 * @param studentId ID of the student
 * @param eventType type of activity (VIEW_PAGE, STUDY_TASK_COMPLETED, QUIZ_COMPLETED)
 * @param sourceType entity source category (e.g. COURSE_MATERIAL_DOCUMENT, STUDY_PLAN_ITEM, QUIZ_ATTEMPT)
 * @param sourceId primary key of the activity source
 * @param quantity number of items (e.g. 1 for page, N for quiz questions)
 * @param idempotencyKey unique key preventing duplicate processing
 */
public record RecordLearningEventCommand(
        UUID studentId,
        EventType eventType,
        String sourceType,
        UUID sourceId,
        int quantity,
        String idempotencyKey
) {}
