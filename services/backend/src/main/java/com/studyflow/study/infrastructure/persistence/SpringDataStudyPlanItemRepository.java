package com.studyflow.study.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

interface SpringDataStudyPlanItemRepository extends JpaRepository<StudyPlanItemJpaEntity, UUID> {

    @Query("""
            select item from StudyPlanItemJpaEntity item
            where item.id = :itemId
              and item.planId = :planId
              and item.planId in (
                select plan.id from StudyPlanJpaEntity plan where plan.studentId = :studentId
              )
            """)
    Optional<StudyPlanItemJpaEntity> findOwned(
            @Param("itemId") UUID itemId,
            @Param("planId") UUID planId,
            @Param("studentId") UUID studentId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select item from StudyPlanItemJpaEntity item
            where item.id = :itemId
              and item.planId in (
                select plan.id from StudyPlanJpaEntity plan where plan.studentId = :studentId
              )
            """)
    Optional<StudyPlanItemJpaEntity> findOwnedForUpdate(
            @Param("itemId") UUID itemId,
            @Param("studentId") UUID studentId
    );

    @Query("""
            select item from StudyPlanItemJpaEntity item
            where item.planId = :planId
              and item.status <> com.studyflow.study.domain.StudyPlanItemStatus.DELETED
              and item.planId in (
                select plan.id from StudyPlanJpaEntity plan where plan.studentId = :studentId
              )
            order by item.scheduledStart asc nulls last, item.dueAt asc nulls last, item.createdAt asc
            """)
    List<StudyPlanItemJpaEntity> findAllOwnedUnpaged(
            @Param("planId") UUID planId,
            @Param("studentId") UUID studentId
    );

    @Query("""
            select item from StudyPlanItemJpaEntity item
            where item.planId = :planId
              and item.status <> com.studyflow.study.domain.StudyPlanItemStatus.DELETED
              and item.planId in (
                select plan.id from StudyPlanJpaEntity plan where plan.studentId = :studentId
              )
            """)
    Page<StudyPlanItemJpaEntity> findAllOwned(
            @Param("planId") UUID planId,
            @Param("studentId") UUID studentId,
            Pageable pageable
    );

    @Query("""
            select item from StudyPlanItemJpaEntity item
            where item.status <> com.studyflow.study.domain.StudyPlanItemStatus.CANCELLED
              and item.status <> com.studyflow.study.domain.StudyPlanItemStatus.DELETED
              and item.planId in (
                select plan.id from StudyPlanJpaEntity plan
                where plan.studentId = :studentId
                  and plan.status <> com.studyflow.study.domain.StudyPlanStatus.ARCHIVED
              )
              and (
                (item.scheduledStart < :to and item.scheduledEnd > :from)
                or (item.dueAt >= :from and item.dueAt < :to)
              )
            order by item.scheduledStart asc nulls last, item.dueAt asc nulls last
            """)
    List<StudyPlanItemJpaEntity> findCalendarItems(
            @Param("studentId") UUID studentId,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    @Query("""
            select count(item) from StudyPlanItemJpaEntity item
            where item.status <> com.studyflow.study.domain.StudyPlanItemStatus.CANCELLED
              and item.status <> com.studyflow.study.domain.StudyPlanItemStatus.DELETED
              and item.planId in (
                select plan.id from StudyPlanJpaEntity plan where plan.studentId = :studentId
              )
              and item.scheduledStart < :end
              and item.scheduledEnd > :start
              and (:excludedItemId is null or item.id <> :excludedItemId)
            """)
    long countScheduleConflicts(
            @Param("studentId") UUID studentId,
            @Param("start") Instant start,
            @Param("end") Instant end,
            @Param("excludedItemId") UUID excludedItemId
    );

    @Query("""
            select item.id as itemId,
                   plan.studentId as studentId,
                   item.title as itemTitle,
                   item.dueAt as dueAt
            from StudyPlanItemJpaEntity item, StudyPlanJpaEntity plan
            where item.planId = plan.id
              and item.status = com.studyflow.study.domain.StudyPlanItemStatus.TODO
              and plan.status <> com.studyflow.study.domain.StudyPlanStatus.ARCHIVED
              and item.reminderAt is not null
              and item.reminderAt <= :now
              and item.reminderSentAt is null
              and item.dueAt > :now
            order by item.reminderAt asc
            """)
    List<StudyReminderProjection> findDueReminderCandidates(
            @Param("now") Instant now,
            Pageable pageable
    );

    @Modifying
    @Query("""
            update StudyPlanItemJpaEntity item
            set item.reminderSentAt = :sentAt,
                item.updatedAt = :sentAt
            where item.id = :itemId
              and item.reminderSentAt is null
            """)
    int markReminderSent(@Param("itemId") UUID itemId, @Param("sentAt") Instant sentAt);
}
