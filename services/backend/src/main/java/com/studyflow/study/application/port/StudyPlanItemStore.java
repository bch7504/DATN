package com.studyflow.study.application.port;

import com.studyflow.study.domain.StudyPlanItem;
import com.studyflow.study.application.PageResult;
import com.studyflow.study.application.StudyReminderCandidate;
import com.studyflow.study.application.StudyExpiredCandidate;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudyPlanItemStore {
    StudyPlanItem save(StudyPlanItem item);

    /**
     * Args: persisted plan item owned by the Student in the current transaction.
     * Input: item previously loaded with an owner-scoped write lock.
     * Output: void; physically removes the item row. Errors: persistence failures propagate.
     */
    void delete(StudyPlanItem item);

    Optional<StudyPlanItem> findOwned(UUID itemId, UUID planId, UUID studentId);

    Optional<StudyPlanItem> findOwnedForUpdate(UUID itemId, UUID studentId);

    List<StudyPlanItem> findAllOwnedUnpaged(UUID planId, UUID studentId);

    PageResult<StudyPlanItem> findAllOwned(UUID planId, UUID studentId, int page, int size);

    List<StudyPlanItem> findCalendarItems(UUID studentId, Instant from, Instant to);

    boolean hasScheduleConflict(UUID studentId, Instant start, Instant end, UUID excludedItemId);

    /**
     * Returns at most {@code limit} unsent TODO reminders due at {@code now}, ordered oldest first.
     */
    List<StudyReminderCandidate> findDueReminderCandidates(Instant now, int limit);

    /**
     * Args: current time and positive batch limit. Input: active items past their deadline without
     * an expiry notice. Output: bounded candidates, ordered by deadline. Errors: persistence failure.
     */
    List<StudyExpiredCandidate> findExpiredCandidates(Instant now, int limit);

    /**
     * Marks a reminder as sent only when it has not already been processed.
     *
     * @return true when this call changed the row
     */
    boolean markReminderSent(UUID itemId, Instant sentAt);
}
