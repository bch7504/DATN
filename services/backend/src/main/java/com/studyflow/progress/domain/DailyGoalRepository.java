package com.studyflow.progress.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA Repository for DailyGoal entity.
 */
@Repository
public interface DailyGoalRepository extends JpaRepository<DailyGoal, UUID> {

    /**
     * Args: studentId.
     * Input: student UUID.
     * Output: Optional containing configured DailyGoal, or empty if not yet customized.
     * Errors: DataAccessException on persistence error.
     */
    Optional<DailyGoal> findByStudentId(UUID studentId);

    /**
     * Args: studentId.
     * Input: student UUID.
     * Output: true if student already has a configured daily goal, false otherwise.
     * Errors: DataAccessException on persistence error.
     */
    boolean existsByStudentId(UUID studentId);
}
