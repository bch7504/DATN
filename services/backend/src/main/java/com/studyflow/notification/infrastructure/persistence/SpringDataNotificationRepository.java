package com.studyflow.notification.infrastructure.persistence;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataNotificationRepository extends JpaRepository<NotificationJpaEntity, UUID> {

    Optional<NotificationJpaEntity> findByIdAndUserId(UUID id, UUID userId);

    Page<NotificationJpaEntity> findAllByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<NotificationJpaEntity> findAllByUserIdAndReadAtIsNullOrderByCreatedAtDesc(
            UUID userId,
            Pageable pageable
    );

    /**
     * Args: generated id, owner/source UUIDs, bounded title/message and due/creation instants.
     * Input: active application transaction. Output: 1 inserted, 0 duplicate owner/type/source.
     * Errors: persistence errors propagate; existing read state/timestamps are never overwritten.
     * Target-free ON CONFLICT relies on PostgreSQL; uniqueness is schema-enforced.
     */
    @Modifying
    @Query(value = """
            INSERT INTO app.notifications (
                id, user_id, notification_type, title, message, source_type,
                source_id, due_at, read_at, created_at
            ) VALUES (
                :id, :userId, 'STUDY_PLAN_DEADLINE', :title, :message,
                'STUDY_PLAN_ITEM', :itemId, :dueAt, NULL, :createdAt
            )
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertDeadlineReminderIfAbsent(
            @Param("id") UUID id,
            @Param("userId") UUID userId,
            @Param("itemId") UUID itemId,
            @Param("title") String title,
            @Param("message") String message,
            @Param("dueAt") Instant dueAt,
            @Param("createdAt") Instant createdAt
    );

    /** Args: required generated/owner/source IDs, message and times. Input: transaction. Output: 1 new/0 duplicate; errors: DB failure. */
    @Modifying
    @Query(value = """
            INSERT INTO app.notifications (
                id, user_id, notification_type, title, message, source_type,
                source_id, due_at, read_at, created_at
            ) VALUES (
                :id, :userId, 'ASSIGNMENT_DEADLINE', 'Bài tập sắp đến hạn',
                :message, 'COURSE_ASSIGNMENT', :assignmentId, :dueAt, NULL, :createdAt
            ) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertAssignmentReminderIfAbsent(
            @Param("id") UUID id,
            @Param("userId") UUID userId,
            @Param("assignmentId") UUID assignmentId,
            @Param("message") String message,
            @Param("dueAt") Instant dueAt,
            @Param("createdAt") Instant createdAt
    );

    /** Args: required generated/owner/source IDs, message and times. Input: transaction. Output: 1 new/0 duplicate; errors: DB failure. */
    @Modifying
    @Query(value = """
            INSERT INTO app.notifications (
                id, user_id, notification_type, title, message, source_type,
                source_id, due_at, read_at, created_at
            ) VALUES (
                :id, :userId, 'ASSIGNMENT_PUBLISHED', 'Bài tập mới được giao',
                :message, 'COURSE_ASSIGNMENT', :assignmentId, :dueAt, NULL, :createdAt
            ) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertAssignmentPublishedIfAbsent(
            @Param("id") UUID id,
            @Param("userId") UUID userId,
            @Param("assignmentId") UUID assignmentId,
            @Param("message") String message,
            @Param("dueAt") Instant dueAt,
            @Param("createdAt") Instant createdAt
    );
}
