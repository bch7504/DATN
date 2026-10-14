package com.studyflow.study.application.port;

import com.studyflow.study.domain.StudyPlan;
import com.studyflow.study.domain.StudyPlanStatus;
import com.studyflow.study.application.PageResult;
import java.util.Optional;
import java.util.UUID;

public interface StudyPlanStore {
    StudyPlan save(StudyPlan plan);

    Optional<StudyPlan> findOwned(UUID planId, UUID studentId);

    PageResult<StudyPlan> findAllOwned(UUID studentId, StudyPlanStatus status, int page, int size);
}
