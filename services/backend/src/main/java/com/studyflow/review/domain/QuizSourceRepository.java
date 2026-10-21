package com.studyflow.review.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizSourceRepository extends JpaRepository<QuizSource, UUID> {
    List<QuizSource> findByQuizId(UUID quizId);
}
