package com.studyflow.assignment.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssignmentSubmissionAttachmentRepository
        extends JpaRepository<AssignmentSubmissionAttachment, UUID> {
    List<AssignmentSubmissionAttachment> findBySubmissionIdOrderByCreatedAt(UUID submissionId);
    Optional<AssignmentSubmissionAttachment> findByIdAndSubmissionId(UUID id, UUID submissionId);
    long countBySubmissionId(UUID submissionId);
}
