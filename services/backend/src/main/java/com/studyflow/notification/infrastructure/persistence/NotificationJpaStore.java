package com.studyflow.notification.infrastructure.persistence;

import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.notification.domain.StudentNotification;
import com.studyflow.study.application.PageResult;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationJpaStore implements NotificationStore {

    private final SpringDataNotificationRepository repository;

    /**
     * Creates the JPA notification adapter.
     *
     * @param repository Spring Data repository for app.notifications
     */
    public NotificationJpaStore(SpringDataNotificationRepository repository) {
        this.repository = repository;
    }

    @Override
    public boolean createDeadlineReminderIfAbsent(
            UUID userId,
            UUID itemId,
            String title,
            String message,
            Instant dueAt,
            Instant createdAt
    ) {
        return repository.insertDeadlineReminderIfAbsent(
                UUID.randomUUID(), userId, itemId, title, message, dueAt, createdAt
        ) == 1;
    }

    @Override
    public PageResult<StudentNotification> findOwned(
            UUID userId,
            boolean unreadOnly,
            int page,
            int size
    ) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<NotificationJpaEntity> results = unreadOnly
                ? repository.findAllByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable)
                : repository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);
        return new PageResult<>(
                results.getContent().stream().map(NotificationJpaEntity::toDomain).toList(),
                results.getNumber(), results.getSize(), results.getTotalElements(), results.getTotalPages()
        );
    }

    @Override
    public Optional<StudentNotification> findOwned(UUID notificationId, UUID userId) {
        return repository.findByIdAndUserId(notificationId, userId).map(NotificationJpaEntity::toDomain);
    }

    @Override
    public StudentNotification save(StudentNotification notification) {
        return repository.save(NotificationJpaEntity.fromDomain(notification)).toDomain();
    }
}
