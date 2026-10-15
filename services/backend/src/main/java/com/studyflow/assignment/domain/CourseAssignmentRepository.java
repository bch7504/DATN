package com.studyflow.assignment.domain;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseAssignmentRepository extends JpaRepository<CourseAssignment, UUID> {
    List<CourseAssignment> findByCourseOfferingIdOrderByCreatedAtDesc(UUID courseOfferingId);
    List<CourseAssignment> findByCourseOfferingIdInAndStatusOrderByDueAtAsc(
            Collection<UUID> courseOfferingIds, AssignmentStatus status);
    List<CourseAssignment> findByStatusAndReminderAtLessThanEqualAndReminderSentAtIsNull(
            AssignmentStatus status, Instant now);
}
