package com.studyflow.progress.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for querying learning events to compute Streak and Daily Goal actuals.
 */
@Repository
public interface LearningEventRepository extends JpaRepository<LearningEvent, UUID> {

    /**
     * Checks idempotency key to prevent double recording of events.
     * Args: studentId, eventType, idempotencyKey.
     * Output: true if already recorded, false otherwise.
     */
    boolean existsByStudentIdAndEventTypeAndIdempotencyKey(
            UUID studentId,
            EventType eventType,
            String idempotencyKey
    );

    /**
     * Retrieves all distinct activity dates on which the student had at least one valid activity event,
     * ordered from most recent to oldest.
     * Args: studentId.
     * Output: descending list of unique LocalDates.
     */
    @Query("""
            SELECT DISTINCT e.activityDate
            FROM ProgressLearningEvent e
            WHERE e.studentId = :studentId
            ORDER BY e.activityDate DESC
            """)
    List<LocalDate> findDistinctActivityDatesByStudentId(@Param("studentId") UUID studentId);

    /**
     * Counts distinct Course Material PDF pages viewed on the specified activity date.
     * Args: studentId, activityDate.
     * Output: count of unique page sourceIds viewed on that day.
     */
    @Query("""
            SELECT COUNT(DISTINCT e.sourceId)
            FROM ProgressLearningEvent e
            WHERE e.studentId = :studentId
              AND e.eventType = com.studyflow.progress.domain.EventType.VIEW_PAGE
              AND e.activityDate = :activityDate
            """)
    int countDistinctViewPageByStudentIdAndActivityDate(
            @Param("studentId") UUID studentId,
            @Param("activityDate") LocalDate activityDate
    );

    /**
     * Counts distinct study plan tasks completed on the specified activity date.
     * Args: studentId, activityDate.
     * Output: count of unique task sourceIds completed on that day.
     */
    @Query("""
            SELECT COUNT(DISTINCT e.sourceId)
            FROM ProgressLearningEvent e
            WHERE e.studentId = :studentId
              AND e.eventType = com.studyflow.progress.domain.EventType.STUDY_TASK_COMPLETED
              AND e.activityDate = :activityDate
            """)
    int countDistinctStudyTaskByStudentIdAndActivityDate(
            @Param("studentId") UUID studentId,
            @Param("activityDate") LocalDate activityDate
    );

    /**
     * Sums the total quiz questions answered in completed quiz attempts on the specified activity date.
     * Args: studentId, activityDate.
     * Output: total questions answered in scored attempts on that day.
     */
    @Query("""
            SELECT COALESCE(SUM(e.quantity), 0)
            FROM ProgressLearningEvent e
            WHERE e.studentId = :studentId
              AND e.eventType = com.studyflow.progress.domain.EventType.QUIZ_COMPLETED
              AND e.activityDate = :activityDate
            """)
    int sumQuizQuestionsByStudentIdAndActivityDate(
            @Param("studentId") UUID studentId,
            @Param("activityDate") LocalDate activityDate
    );
}
