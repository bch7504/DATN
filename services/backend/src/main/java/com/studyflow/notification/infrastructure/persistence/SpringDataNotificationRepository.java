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

    @Modifying
    @Query(value = """
            INSERT INTO app.notifications (
                id, user_id, notification_type, title, message, source_type,
                source_id, due_at, read_at, created_at
            ) VALUES (
                :id, :userId, 'STUDY_PLAN_DEADLINE', :title, :message,
                'STUDY_PLAN_ITEM', :itemId, :dueAt, NULL, :createdAt
            )
            ON CONFLICT (user_id, notification_type, source_type, source_id) DO NOTHING
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
}
