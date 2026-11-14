package com.studyflow.admin.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Typed public DTOs for allowlisted Admin and feedback operations. */
public final class AdminModels {
    private AdminModels() { }

    /** Page metadata shared by bounded Admin lists. */
    public record Page<T>(List<T> items, int page, int size, long totalItems, int totalPages) { }
    /** Aggregate counts; no private Student content is exposed. */
    public record Dashboard(long users, long students, long teachers, long activeOfferings,
                            long pendingEnrollments, long publishedDocuments, long openFeedbackReports) { }
    /** Safe account metadata. */
    public record User(UUID id, String email, String username, String fullName,
                       String role, String status, Instant createdAt,
                       UUID subjectId, String subjectCode, String subjectName) {
        /** Args: safe identity metadata without subject. Output: DTO with no assignment; errors: none. */
        public User(UUID id, String email, String username, String fullName, String role, String status, Instant createdAt) {
            this(id, email, username, fullName, role, status, createdAt, null, null, null);
        }
    }
    /** Only status may change. Legacy role field is explicitly rejected by the service. */
    public record UserUpdate(String role, String status) { }
    /** Admin-only account input; password is never rendered by toString or returned in a response. */
    public record CreateTeacher(
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=100) String fullName,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Email @jakarta.validation.constraints.Size(max=254) String email,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Pattern(regexp="[A-Za-z0-9][A-Za-z0-9._-]{2,99}") String username,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(min=8,max=72) String password,
            @jakarta.validation.constraints.NotNull UUID subjectId) {
        /** Args: none. Output: fixed redacted description; errors: none. */
        @Override public String toString() { return "CreateTeacher[password=<redacted>]"; }
    }
    /** Subject catalog entry. */
    public record Subject(UUID id, String code, String name, int credits, String description, String status) { }
    /** Create or partial-update fields; service validates required values and lengths. */
    public record SubjectInput(String code, String name, Integer credits, String description, String status) { }
    /** Semester catalog entry. */
    public record Semester(UUID id, String code, String name, String academicYear,
                           LocalDate startDate, LocalDate endDate, String status,
                           boolean offeringCreationEnabled) { }
    /** Create or partial-update semester fields. */
    public record SemesterInput(String code, String name, String academicYear, LocalDate startDate,
                                LocalDate endDate, String status, Boolean offeringCreationEnabled) { }
    /** Safe Course Offering metadata, excluding join-code hash and Personal data. */
    public record Offering(UUID id, String code, String name, String subjectCode, String semesterCode,
                           UUID teacherId, String teacherName, String status, long approvedStudents,
                           Instant createdAt) { }
    /** A user-submitted feedback report. */
    public record Feedback(UUID id, UUID reporterId, String type, String title, String content,
                           String status, String resolution, Instant createdAt, Instant updatedAt) { }
    /** Required report fields from the authenticated reporter. */
    public record FeedbackInput(String type, String title, String content) { }
    /** Admin resolution fields. */
    public record FeedbackUpdate(String status, String resolution) { }
    /** Safe audit event with no secrets, prompt, file content or arbitrary metadata. */
    public record SystemLog(UUID id, UUID actorId, String action, String targetType, UUID targetId,
                            String status, String traceId, Instant createdAt) { }
    /** Runtime setting that currently has an enforced consumer. */
    public record Settings(boolean registrationEnabled) { }
    /** Required setting mutation. */
    public record SettingsUpdate(Boolean registrationEnabled) { }
}
