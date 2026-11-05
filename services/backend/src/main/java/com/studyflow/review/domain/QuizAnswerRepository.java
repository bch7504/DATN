package com.studyflow.review.domain;

import java.util.List;
import java.util.Collection;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizAnswerRepository extends JpaRepository<QuizAnswer, UUID> {
    List<QuizAnswer> findByAttemptId(UUID attemptId);
    List<QuizAnswer> findByAttemptIdIn(Collection<UUID> attemptIds);
    List<QuizAnswer> findByAttemptIdAndIsCorrectFalse(UUID attemptId);
}
