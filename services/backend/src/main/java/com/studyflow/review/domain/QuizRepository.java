package com.studyflow.review.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, UUID> {
    /** Args: approved offering, authenticated owner, STUDENT role and READY status.
     * Input: Java-authorized review scope. Output: own practice quizzes newest first.
     * Errors: database access failures propagate; no state is changed. */
    List<Quiz> findByCourseOfferingIdAndCreatedByAndCreatorRoleAndStatusOrderByCreatedAtDesc(
            UUID courseOfferingId, UUID createdBy, QuizCreatorRole creatorRole, QuizStatus status);
    List<Quiz> findByCreatedByOrderByCreatedAtDesc(UUID createdBy);
    List<Quiz> findByCreatedByAndCourseOfferingIdIsNullOrderByCreatedAtDesc(UUID createdBy);
    List<Quiz> findByCourseOfferingIdAndStatusInOrderByCreatedAtDesc(UUID courseOfferingId, Collection<QuizStatus> statuses);
    int countByCourseOfferingIdAndStatusIn(UUID courseOfferingId, Collection<QuizStatus> statuses);
    Optional<Quiz> findByIdAndCreatedBy(UUID id, UUID createdBy);
}
