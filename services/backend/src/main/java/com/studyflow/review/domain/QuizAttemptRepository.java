package com.studyflow.review.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {
    List<QuizAttempt> findByQuizIdAndStudentIdOrderByCreatedAtDesc(UUID quizId, UUID studentId);
    List<QuizAttempt> findByStudentIdOrderByCreatedAtDesc(UUID studentId);
    List<QuizAttempt> findByQuizIdInAndStudentIdOrderByCreatedAtDesc(Collection<UUID> quizIds, UUID studentId);
    Optional<QuizAttempt> findByIdAndStudentId(UUID id, UUID studentId);
}
