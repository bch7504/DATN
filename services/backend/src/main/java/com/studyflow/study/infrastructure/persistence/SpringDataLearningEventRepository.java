package com.studyflow.study.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataLearningEventRepository extends JpaRepository<LearningEventJpaEntity, UUID> {
    boolean existsByStudentIdAndEventTypeAndSourceTypeAndSourceId(
            UUID studentId,
            String eventType,
            String sourceType,
            UUID sourceId
    );
}
