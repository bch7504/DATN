package com.studyflow.study.infrastructure.persistence;

import com.studyflow.study.application.port.StudyPlanItemStore;
import com.studyflow.study.application.PageResult;
import com.studyflow.study.domain.StudyPlanItem;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@Repository
public class StudyPlanItemJpaStore implements StudyPlanItemStore {

    private final SpringDataStudyPlanItemRepository repository;

    public StudyPlanItemJpaStore(SpringDataStudyPlanItemRepository repository) {
        this.repository = repository;
    }

    @Override
    public StudyPlanItem save(StudyPlanItem item) {
        return repository.save(StudyPlanItemJpaEntity.fromDomain(item)).toDomain();
    }

    @Override
    public Optional<StudyPlanItem> findOwned(UUID itemId, UUID planId, UUID studentId) {
        return repository.findOwned(itemId, planId, studentId).map(StudyPlanItemJpaEntity::toDomain);
    }

    @Override
    public Optional<StudyPlanItem> findOwnedForUpdate(UUID itemId, UUID studentId) {
        return repository.findOwnedForUpdate(itemId, studentId).map(StudyPlanItemJpaEntity::toDomain);
    }

    @Override
    public List<StudyPlanItem> findAllOwnedUnpaged(UUID planId, UUID studentId) {
        return repository.findAllOwnedUnpaged(planId, studentId).stream()
                .map(StudyPlanItemJpaEntity::toDomain)
                .toList();
    }

    @Override
    public PageResult<StudyPlanItem> findAllOwned(UUID planId, UUID studentId, int page, int size) {
        PageRequest pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Order.asc("scheduledStart").nullsLast(), Sort.Order.asc("dueAt").nullsLast())
        );
        Page<StudyPlanItemJpaEntity> results = repository.findAllOwned(planId, studentId, pageable);
        return new PageResult<>(
                results.getContent().stream().map(StudyPlanItemJpaEntity::toDomain).toList(),
                results.getNumber(), results.getSize(), results.getTotalElements(), results.getTotalPages()
        );
    }

    @Override
    public List<StudyPlanItem> findCalendarItems(UUID studentId, Instant from, Instant to) {
        return repository.findCalendarItems(studentId, from, to).stream()
                .map(StudyPlanItemJpaEntity::toDomain)
                .toList();
    }

    @Override
    public boolean hasScheduleConflict(UUID studentId, Instant start, Instant end, UUID excludedItemId) {
        return repository.countScheduleConflicts(studentId, start, end, excludedItemId) > 0;
    }
}
