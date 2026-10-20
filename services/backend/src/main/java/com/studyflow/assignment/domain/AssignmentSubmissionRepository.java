package com.studyflow.assignment.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, UUID> {
    List<AssignmentSubmission> findByAssignmentId(UUID assignmentId);
    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(UUID assignmentId, UUID studentId);
}
