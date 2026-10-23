package com.studyflow.review.domain;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizQuestionSourceRepository extends JpaRepository<QuizQuestionSource, UUID> {
    List<QuizQuestionSource> findByQuestionId(UUID questionId);
    List<QuizQuestionSource> findByQuestionIdIn(Collection<UUID> questionIds);
}
