package com.studyflow.study.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataLearningEventRepository extends JpaRepository<LearningEventJpaEntity, UUID> {
    boolean existsByStudentIdAndEventTypeAndSourceTypeAndSourceId(
            UUID studentId,
            String eventType,
            String sourceType,
            UUID sourceId
    );

    /** Args: owner and plan item IDs. Input: active deletion transaction. Output: deleted row count; errors: DB failure. */
    @Modifying
    @Query("""
            delete from LearningEventJpaEntity learningEvent
            where learningEvent.studentId = :studentId
              and learningEvent.eventType = 'STUDY_TASK_COMPLETED'
              and learningEvent.sourceType = 'STUDY_PLAN_ITEM'
              and learningEvent.sourceId = :itemId
            """)
    int deleteStudyTaskCompletionEvents(@Param("studentId") UUID studentId, @Param("itemId") UUID itemId);
}
