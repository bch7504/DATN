package com.studyflow.progress.presentation;

import com.studyflow.common.exception.ApiException;
import com.studyflow.progress.application.ConfigureDailyGoalCommand;
import com.studyflow.progress.application.DailyGoalProgressDTO;
import com.studyflow.progress.application.DailyGoalService;
import com.studyflow.progress.application.LearningEventService;
import com.studyflow.progress.application.StudyMetricsService;
import com.studyflow.progress.application.StudyStreakCalculator;
import com.studyflow.progress.domain.LearningEventRepository;
import com.studyflow.progress.dto.StudentDailyGoalRequest;
import com.studyflow.progress.dto.StudentDailyGoalResponse;
import com.studyflow.progress.dto.StudentStreakResponse;
import jakarta.validation.Valid;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller exposing Student Study Streak, Daily Goal, and Learning Event endpoints.
 */
@RestController
@RequestMapping("/api/v1/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentProgressController {

    private final StudyMetricsService studyMetricsService;
    private final DailyGoalService dailyGoalService;
    private final LearningEventService learningEventService;
    private final LearningEventRepository learningEventRepository;
    private final Clock clock;

    public StudentProgressController(
            StudyMetricsService studyMetricsService,
            DailyGoalService dailyGoalService,
            LearningEventService learningEventService,
            LearningEventRepository learningEventRepository,
            Clock clock
    ) {
        this.studyMetricsService = studyMetricsService;
        this.dailyGoalService = dailyGoalService;
        this.learningEventService = learningEventService;
        this.learningEventRepository = learningEventRepository;
        this.clock = clock;
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
        }
    }

    /**
     * Args: jwt.
     * Input: authenticated Student session.
     * Output: StudentStreakResponse with streak numbers, activityDays, and weekly activity.
     */
    @GetMapping({"/study-streak", "/streak"})
    public ResponseEntity<StudentStreakResponse> getStudyStreak(@AuthenticationPrincipal Jwt jwt) {
        UUID studentId = userId(jwt);
        ZoneId zoneId = learningEventService.resolveStudentZone(studentId);
        LocalDate today = LocalDate.now(clock.withZone(zoneId));

        List<LocalDate> activityDates = learningEventRepository.findDistinctActivityDatesByStudentId(studentId);
        StudyStreakCalculator.StreakResult streak = StudyStreakCalculator.calculate(activityDates, today);

        String lastActiveDate = activityDates.isEmpty() ? null : activityDates.get(0).toString();

        // Calculate Monday..Sunday of current week
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<StudentStreakResponse.WeeklyDayActivity> weekly = new ArrayList<>();
        String[] dayNames = {"Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"};
        for (int i = 0; i < 7; i++) {
            LocalDate d = monday.plusDays(i);
            boolean active = activityDates.contains(d);
            weekly.add(new StudentStreakResponse.WeeklyDayActivity(dayNames[i], d.toString(), active, active ? 1 : 0));
        }

        StudentStreakResponse response = new StudentStreakResponse(
                streak.currentStreak(),
                streak.longestStreak(),
                streak.activityDays(),
                zoneId.getId(),
                today,
                lastActiveDate,
                weekly
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Args: jwt.
     * Input: authenticated Student session.
     * Output: StudentDailyGoalResponse comparing targets with actual counts today.
     */
    @GetMapping("/daily-goal")
    public ResponseEntity<StudentDailyGoalResponse> getDailyGoal(@AuthenticationPrincipal Jwt jwt) {
        UUID studentId = userId(jwt);
        DailyGoalProgressDTO progress = dailyGoalService.get(studentId);
        return ResponseEntity.ok(toResponse(progress));
    }

    /**
     * Args: jwt, req.
     * Input: authenticated Student session and target updates.
     * Output: updated StudentDailyGoalResponse.
     * Errors: 422 INVALID_DAILY_GOAL if total target <= 0.
     */
    @PutMapping("/daily-goal")
    public ResponseEntity<StudentDailyGoalResponse> configureDailyGoal(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody StudentDailyGoalRequest req
    ) {
        UUID studentId = userId(jwt);
        if (req.totalTarget() <= 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DAILY_GOAL", "Tổng mục tiêu phải lớn hơn 0");
        }

        ConfigureDailyGoalCommand command = new ConfigureDailyGoalCommand(
                req.pageTarget(),
                req.quizQuestionTarget(),
                req.taskTarget()
        );
        DailyGoalProgressDTO progress = dailyGoalService.configure(studentId, command);
        return ResponseEntity.ok(toResponse(progress));
    }

    private static StudentDailyGoalResponse toResponse(DailyGoalProgressDTO dto) {
        return StudentDailyGoalResponse.from(
                dto.pageTarget(),
                dto.pageActual(),
                dto.quizQuestionTarget(),
                dto.quizQuestionActual(),
                dto.taskTarget(),
                dto.taskActual(),
                dto.completed(),
                dto.date(),
                dto.timeZone()
        );
    }
}
