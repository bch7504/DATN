package com.studyflow.study.application.port;

import com.studyflow.study.domain.StudyPlanItem;
import com.studyflow.study.application.PageResult;
import com.studyflow.study.application.StudyReminderCandidate;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudyPlanItemStore {
    StudyPlanItem save(StudyPlanItem item);

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
     * Marks a reminder as sent only when it has not already been processed.
     *
     * @return true when this call changed the row
     */
    boolean markReminderSent(UUID itemId, Instant sentAt);
}
