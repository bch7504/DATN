package com.studyflow.progress.application;

import com.studyflow.progress.domain.DailyGoal;
import com.studyflow.progress.domain.DailyGoalRepository;
import com.studyflow.progress.domain.LearningEventRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for calculating study streak metrics and daily goal actuals.
 */
@Service
@Transactional(readOnly = true)
public class StudyMetricsService {

    private final LearningEventRepository learningEventRepository;
    private final DailyGoalRepository dailyGoalRepository;
    private final LearningEventService learningEventService;
    private final Clock clock;

    public StudyMetricsService(
            LearningEventRepository learningEventRepository,
            DailyGoalRepository dailyGoalRepository,
            LearningEventService learningEventService,
            Clock clock
    ) {
        this.learningEventRepository = Objects.requireNonNull(learningEventRepository, "learningEventRepository must not be null");
        this.dailyGoalRepository = Objects.requireNonNull(dailyGoalRepository, "dailyGoalRepository must not be null");
        this.learningEventService = Objects.requireNonNull(learningEventService, "learningEventService must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    /**
     * Args: studentId.
     * Input: valid student identifier.
     * Output: StreakDTO with currentStreak, longestStreak, activityDays, timeZone, and asOfDate.
     * Errors: DataAccessException on persistence error.
     */
    public StreakDTO getStreak(UUID studentId) {
        ZoneId zoneId = learningEventService.resolveStudentZone(studentId);
        LocalDate today = LocalDate.now(clock.withZone(zoneId));

        List<LocalDate> activityDates = learningEventRepository.findDistinctActivityDatesByStudentId(studentId);
        StudyStreakCalculator.StreakResult result = StudyStreakCalculator.calculate(activityDates, today);

        return new StreakDTO(
                result.currentStreak(),
                result.longestStreak(),
                result.activityDays(),
                zoneId.getId(),
                today
        );
    }

    /**
     * Args: studentId.
     * Input: valid student identifier.
     * Output: DailyGoalProgressDTO comparing configured targets with actual activity events recorded today.
     * Errors: DataAccessException on persistence error.
     */
    public DailyGoalProgressDTO getDailyGoalProgress(UUID studentId) {
        ZoneId zoneId = learningEventService.resolveStudentZone(studentId);
        LocalDate today = LocalDate.now(clock.withZone(zoneId));

        DailyGoal goal = dailyGoalRepository.findByStudentId(studentId)
                .orElseGet(() -> DailyGoal.defaultForStudent(studentId, clock.instant()));

        int pageActual = learningEventRepository.countDistinctViewPageByStudentIdAndActivityDate(studentId, today);
        int taskActual = learningEventRepository.countDistinctStudyTaskByStudentIdAndActivityDate(studentId, today);
        int quizActual = learningEventRepository.sumQuizQuestionsByStudentIdAndActivityDate(studentId, today);

        boolean completed = pageActual >= goal.getPageTarget()
                && taskActual >= goal.getTaskTarget()
                && quizActual >= goal.getQuizQuestionTarget();

        return new DailyGoalProgressDTO(
                goal.getPageTarget(),
                pageActual,
                goal.getQuizQuestionTarget(),
                quizActual,
                goal.getTaskTarget(),
                taskActual,
                completed,
                today,
                zoneId.getId()
        );
    }
}
