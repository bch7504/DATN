package com.studyflow.review.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Persistence boundary for Java-owned AI Quiz lifecycle. */
public interface QuizDraftStore {
    /** Args: complete validated draft. Input: Java-authorized AI output. Output: inserted draft or the existing same-ID idempotent draft. Errors: persistence failure/owner collision. */
    QuizDraftData save(QuizDraftData draft);

    /** Args: owner and quiz IDs. Input: owner scope. Output: matching draft if active. Errors: persistence failure. */
    Optional<QuizDraftData> findOwned(UUID ownerId, UUID quizId);

    /** Args: owner/quiz, destination and time. Output: updated READY draft. Errors: missing draft/invalid lifecycle. */
    QuizDraftData accept(UUID ownerId, UUID quizId, String destinationType, UUID offeringId, Instant acceptedAt);

    /** Args: owner/quiz. Output: void; marks REJECTED. Errors: missing draft/invalid lifecycle. */
    void reject(UUID ownerId, UUID quizId);

    /** Args: Teacher owner/quiz and time. Output: PUBLISHED draft. Errors: missing draft/invalid lifecycle. */
    QuizDraftData publish(UUID ownerId, UUID quizId, Instant publishedAt);
}
