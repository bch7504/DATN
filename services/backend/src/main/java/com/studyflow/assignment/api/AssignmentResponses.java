package com.studyflow.assignment.api;

import com.studyflow.assignment.domain.AssignmentStatus;
import com.studyflow.assignment.domain.AssignmentSubmission;
import com.studyflow.assignment.domain.AssignmentSubmissionAttachment;
import com.studyflow.assignment.domain.CourseAssignment;
import com.studyflow.assignment.domain.SubmissionStatus;
import java.time.Instant;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonInclude;

public final class AssignmentResponses {
    private AssignmentResponses() {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Assignment(
            UUID id, UUID courseOfferingId, String title, String description,
            Instant dueAt, AssignmentStatus status, Instant publishedAt,
            Instant createdAt, Instant updatedAt, Submission submission
    ) {
        public static Assignment from(CourseAssignment assignment, Submission submission) {
            return new Assignment(assignment.getId(), assignment.getCourseOfferingId(), assignment.getTitle(),
                    assignment.getDescription(), assignment.getDueAt(), assignment.getStatus(),
                    assignment.getPublishedAt(), assignment.getCreatedAt(), assignment.getUpdatedAt(), submission);
        }
    }

    /** Current submission only; no grading fields or previous attempts are exposed. */
    public record Submission(UUID id, String answerText, Instant submittedAt, SubmissionStatus status,
                             java.util.List<Attachment> attachments) {
        public static Submission from(AssignmentSubmission s, java.util.List<Attachment> files) {
            return new Submission(s.getId(), s.getAnswerText(), s.getSubmittedAt(), s.getStatus(),
                    files);
        }
    }

    public record Attachment(UUID id, String fileName, String contentType, long sizeBytes) {
        public static Attachment from(AssignmentSubmissionAttachment file) {
            return new Attachment(file.getId(), file.getOriginalFileName(), file.getContentType(), file.getSizeBytes());
        }
    }

    public record StudentResult(UUID studentId, String fullName, String email,
                                String submissionState, Instant submittedAt, SubmissionStatus status,
                                String answerText, java.util.List<Attachment> attachments) {}

    /** Counts and named students eligible as of the deadline; before deadline includes current approved students. */
    public record AssignmentStats(UUID assignmentId, String title, Instant dueAt,
                                  long approvedStudentCount, long submittedCount,
                                  long onTimeCount, long lateCount, long notSubmittedCount,
                                  java.util.List<StudentResult> students) {}
}
