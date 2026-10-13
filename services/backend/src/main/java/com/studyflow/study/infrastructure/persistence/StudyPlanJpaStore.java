package com.studyflow.study.infrastructure.persistence;

import com.studyflow.study.application.port.StudyPlanStore;
import com.studyflow.study.application.PageResult;
import com.studyflow.study.domain.StudyPlan;
import com.studyflow.study.domain.StudyPlanStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

@Repository
public class StudyPlanJpaStore implements StudyPlanStore {

    private final SpringDataStudyPlanRepository repository;

    public StudyPlanJpaStore(SpringDataStudyPlanRepository repository) {
        this.repository = repository;
    }

    @Override
    public StudyPlan save(StudyPlan plan) {
        return repository.save(StudyPlanJpaEntity.fromDomain(plan)).toDomain();
    }

    @Override
    public Optional<StudyPlan> findOwned(UUID planId, UUID studentId) {
        return repository.findByIdAndStudentId(planId, studentId).map(StudyPlanJpaEntity::toDomain);
    }

    @Override
    public PageResult<StudyPlan> findAllOwned(
            UUID studentId,
            StudyPlanStatus status,
            int page,
            int size
    ) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<StudyPlanJpaEntity> results = status == null
                ? repository.findAllByStudentIdOrderByStartDateDescCreatedAtDesc(studentId, pageable)
                : repository.findAllByStudentIdAndStatusOrderByStartDateDescCreatedAtDesc(
                        studentId, status, pageable
                );
        return new PageResult<>(
                results.getContent().stream().map(StudyPlanJpaEntity::toDomain).toList(),
                results.getNumber(), results.getSize(), results.getTotalElements(), results.getTotalPages()
        );
    }
}
