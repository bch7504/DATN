package com.studyflow.progress.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.progress.domain.DailyGoal;
import com.studyflow.progress.domain.DailyGoalRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DailyGoalServiceTest {

    private DailyGoalRepository dailyGoalRepository;
    private StudyMetricsService studyMetricsService;
    private Clock clock;
    private DailyGoalService dailyGoalService;

    private final UUID studentId = UUID.randomUUID();
    private final Instant now = Instant.parse("2026-10-21T10:00:00Z");

    @BeforeEach
    void setUp() {
        dailyGoalRepository = mock(DailyGoalRepository.class);
        studyMetricsService = mock(StudyMetricsService.class);
        clock = Clock.fixed(now, ZoneOffset.UTC);
        dailyGoalService = new DailyGoalService(dailyGoalRepository, studyMetricsService, clock);
    }

    @Test
    @DisplayName("Should configure daily goal targets and return current progress")
    void shouldConfigureDailyGoal() {
        ConfigureDailyGoalCommand command = new ConfigureDailyGoalCommand(10, 20, 5);
        when(dailyGoalRepository.findByStudentId(studentId)).thenReturn(Optional.empty());

        DailyGoalProgressDTO expected = new DailyGoalProgressDTO(
                10, 0, 20, 0, 5, 0, false, LocalDate.of(2026, 10, 21), "UTC"
        );
        when(studyMetricsService.getDailyGoalProgress(studentId)).thenReturn(expected);

        DailyGoalProgressDTO result = dailyGoalService.configure(studentId, command);

        verify(dailyGoalRepository).save(any(DailyGoal.class));
        assertEquals(10, result.pageTarget());
        assertEquals(20, result.quizQuestionTarget());
        assertEquals(5, result.taskTarget());
        assertFalse(result.completed());
    }

    @Test
    @DisplayName("Should reject configuration if total target is zero")
    void shouldRejectZeroTotalTarget() {
        ConfigureDailyGoalCommand command = new ConfigureDailyGoalCommand(0, 0, 0);

        assertThrows(IllegalArgumentException.class, () ->
                dailyGoalService.configure(studentId, command)
        );
    }
}
