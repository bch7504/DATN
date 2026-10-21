package com.studyflow.progress.application;

import com.studyflow.progress.domain.DailyGoal;
import com.studyflow.progress.domain.DailyGoalRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for configuring and retrieving daily learning goals.
 */
@Service
public class DailyGoalService {

    private final DailyGoalRepository dailyGoalRepository;
    private final StudyMetricsService studyMetricsService;
    private final Clock clock;

    public DailyGoalService(
            DailyGoalRepository dailyGoalRepository,
            StudyMetricsService studyMetricsService,
            Clock clock
    ) {
        this.dailyGoalRepository = Objects.requireNonNull(dailyGoalRepository, "dailyGoalRepository must not be null");
        this.studyMetricsService = Objects.requireNonNull(studyMetricsService, "studyMetricsService must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    /**
     * Args: studentId.
     * Input: valid student identifier.
     * Output: current DailyGoalProgressDTO.
     */
    @Transactional(readOnly = true)
    public DailyGoalProgressDTO get(UUID studentId) {
        return studyMetricsService.getDailyGoalProgress(studentId);
    }

    /**
     * Args: studentId, command.
     * Input: student identifier and target values conforming to bounds.
     * Output: updated DailyGoalProgressDTO reflecting new targets and freshly computed actuals.
     * Errors: IllegalArgumentException if target values violate validation limits.
     */
    @Transactional
    public DailyGoalProgressDTO configure(UUID studentId, ConfigureDailyGoalCommand command) {
        Objects.requireNonNull(command, "command must not be null");
        DailyGoal.validateTargets(command.pageTarget(), command.quizQuestionTarget(), command.taskTarget());

        Instant now = clock.instant();
        DailyGoal goal = dailyGoalRepository.findByStudentId(studentId)
                .map(existing -> {
                    existing.updateTargets(command.pageTarget(), command.quizQuestionTarget(), command.taskTarget(), now);
                    return existing;
                })
                .orElseGet(() -> new DailyGoal(
                        UUID.randomUUID(),
                        studentId,
                        command.pageTarget(),
                        command.quizQuestionTarget(),
                        command.taskTarget(),
                        now,
                        now
                ));

        dailyGoalRepository.save(goal);
        return studyMetricsService.getDailyGoalProgress(studentId);
    }
}
