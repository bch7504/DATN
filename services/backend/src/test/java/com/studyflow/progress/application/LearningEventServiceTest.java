package com.studyflow.progress.application;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.progress.domain.EventType;
import com.studyflow.progress.domain.LearningEvent;
import com.studyflow.progress.domain.LearningEventRepository;
import com.studyflow.user.domain.UserRole;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LearningEventServiceTest {

    private LearningEventRepository learningEventRepository;
    private UserAccountStore userAccountStore;
    private Clock clock;
    private LearningEventService learningEventService;

    private final UUID studentId = UUID.randomUUID();
    // 2026-10-21 18:00:00 UTC is 2026-10-22 01:00:00 in Asia/Ho_Chi_Minh (+7)
    private final Instant now = Instant.parse("2026-10-21T18:00:00Z");

    @BeforeEach
    void setUp() {
        learningEventRepository = mock(LearningEventRepository.class);
        userAccountStore = mock(UserAccountStore.class);
        clock = Clock.fixed(now, ZoneOffset.UTC);
        learningEventService = new LearningEventService(learningEventRepository, userAccountStore, clock);
    }

    @Test
    @DisplayName("Should resolve activityDate using student's timezone (Asia/Ho_Chi_Minh)")
    void shouldResolveActivityDateInUserTimezone() {
        UserAccount student = new UserAccount(
                studentId, "student@studyflow.com", "student", "hash", "Student",
                "Asia/Ho_Chi_Minh", UserRole.STUDENT, UserStatus.ACTIVE, now, now, now
        );
        when(userAccountStore.findById(studentId)).thenReturn(Optional.of(student));
        when(learningEventRepository.existsByStudentIdAndEventTypeAndIdempotencyKey(any(), any(), any()))
                .thenReturn(false);

        RecordLearningEventCommand command = new RecordLearningEventCommand(
                studentId, EventType.VIEW_PAGE, "COURSE_MATERIAL_DOCUMENT", UUID.randomUUID(), 1, "key-123"
        );

        learningEventService.recordEvent(command);

        ArgumentCaptor<LearningEvent> captor = ArgumentCaptor.forClass(LearningEvent.class);
        verify(learningEventRepository).save(captor.capture());

        LearningEvent saved = captor.getValue();
        // Since it was 18:00 UTC on Oct 21, in +7 it is already Oct 22!
        assertEquals(LocalDate.of(2026, 10, 22), saved.getActivityDate());
        assertEquals(EventType.VIEW_PAGE, saved.getEventType());
    }

    @Test
    @DisplayName("Should skip saving if event with same idempotency key already exists")
    void shouldSkipDuplicateEvent() {
        when(learningEventRepository.existsByStudentIdAndEventTypeAndIdempotencyKey(studentId, EventType.VIEW_PAGE, "key-duplicate"))
                .thenReturn(true);

        RecordLearningEventCommand command = new RecordLearningEventCommand(
                studentId, EventType.VIEW_PAGE, "COURSE_MATERIAL_DOCUMENT", UUID.randomUUID(), 1, "key-duplicate"
        );

        learningEventService.recordEvent(command);

        verify(learningEventRepository, never()).save(any());
    }
}
