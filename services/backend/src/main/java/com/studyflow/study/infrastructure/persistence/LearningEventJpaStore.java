package com.studyflow.study.infrastructure.persistence;

import com.studyflow.study.application.port.LearningEventStore;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class LearningEventJpaStore implements LearningEventStore {

    private static final String EVENT_TYPE = "STUDY_TASK_COMPLETED";
    private static final String SOURCE_TYPE = "STUDY_PLAN_ITEM";

    private final SpringDataLearningEventRepository repository;

    public LearningEventJpaStore(SpringDataLearningEventRepository repository) {
        this.repository = repository;
    }

    @Override
    public void recordStudyTaskCompleted(
            UUID studentId,
            UUID itemId,
            String idempotencyKey,
            Instant occurredAt,
            LocalDate activityDate
    ) {
        if (!repository.existsByStudentIdAndEventTypeAndSourceTypeAndSourceId(
                studentId, EVENT_TYPE, SOURCE_TYPE, itemId
        )) {
            repository.save(LearningEventJpaEntity.studyTaskCompleted(
                    studentId, itemId, idempotencyKey, occurredAt, activityDate
            ));
        }
    }

    @Override
    public int deleteStudyTaskCompletionEvents(UUID studentId, UUID itemId) {
        return repository.deleteStudyTaskCompletionEvents(studentId, itemId);
    }
}
