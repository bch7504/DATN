package com.studyflow.study.infrastructure.persistence;

import com.studyflow.study.domain.StudyPlanStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataStudyPlanRepository extends JpaRepository<StudyPlanJpaEntity, UUID> {
    Optional<StudyPlanJpaEntity> findByIdAndStudentId(UUID id, UUID studentId);

    Page<StudyPlanJpaEntity> findAllByStudentIdOrderByStartDateDescCreatedAtDesc(
            UUID studentId,
            Pageable pageable
    );

    Page<StudyPlanJpaEntity> findAllByStudentIdAndStatusOrderByStartDateDescCreatedAtDesc(
            UUID studentId,
            StudyPlanStatus status,
            Pageable pageable
    );
}
