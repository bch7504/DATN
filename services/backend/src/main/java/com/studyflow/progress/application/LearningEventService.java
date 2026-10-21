package com.studyflow.progress.application;

import com.studyflow.progress.domain.EventType;
import com.studyflow.progress.domain.LearningEvent;
import com.studyflow.progress.domain.LearningEventRepository;
import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.user.domain.UserAccount;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Application service for recording learning activity events with timezone normalization.
 */
@Service
public class LearningEventService {

    private static final Logger log = LoggerFactory.getLogger(LearningEventService.class);
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final LearningEventRepository learningEventRepository;
    private final UserAccountStore userAccountStore;
    private final Clock clock;

    public LearningEventService(
            LearningEventRepository learningEventRepository,
            UserAccountStore userAccountStore,
            Clock clock
    ) {
        this.learningEventRepository = Objects.requireNonNull(learningEventRepository, "learningEventRepository must not be null");
        this.userAccountStore = Objects.requireNonNull(userAccountStore, "userAccountStore must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    /**
     * Args: command containing event metadata and idempotency key.
     * Input: valid event command with student ID.
     * Output: void; saves event or skips if already recorded.
     * Errors: DataAccessException on DB failure.
     */
    @Transactional
    public void recordEvent(RecordLearningEventCommand command) {
        Objects.requireNonNull(command, "command must not be null");
        if (learningEventRepository.existsByStudentIdAndEventTypeAndIdempotencyKey(
                command.studentId(), command.eventType(), command.idempotencyKey())) {
            log.debug("Learning event already exists for student={}, type={}, key={}",
                    command.studentId(), command.eventType(), command.idempotencyKey());
            return;
        }

        Instant now = clock.instant();
        ZoneId zoneId = resolveStudentZone(command.studentId());
        LocalDate activityDate = now.atZone(zoneId).toLocalDate();

        LearningEvent event = LearningEvent.record(
                command.studentId(),
                command.eventType(),
                command.sourceType(),
                command.sourceId(),
                command.quantity(),
                command.idempotencyKey(),
                now,
                activityDate
        );

        learningEventRepository.save(event);
        log.info("Recorded learning event: student={}, type={}, source={}, date={}",
                command.studentId(), command.eventType(), command.sourceId(), activityDate);
    }

    /**
     * Args: studentId.
     * Input: student UUID.
     * Output: resolved ZoneId from user profile or fallback Asia/Ho_Chi_Minh.
     */
    public ZoneId resolveStudentZone(UUID studentId) {
        return userAccountStore.findById(studentId)
                .map(UserAccount::timeZone)
                .filter(tz -> tz != null && !tz.isBlank())
                .map(tz -> {
                    try {
                        return ZoneId.of(tz.strip());
                    } catch (Exception e) {
                        log.warn("Invalid timezone '{}' for user {}, fallback to {}", tz, studentId, DEFAULT_ZONE);
                        return DEFAULT_ZONE;
                    }
                })
                .orElse(DEFAULT_ZONE);
    }
}
