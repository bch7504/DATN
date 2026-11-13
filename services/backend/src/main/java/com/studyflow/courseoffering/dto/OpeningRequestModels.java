package com.studyflow.courseoffering.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Typed opening-request input/output. Only approval produces a courseOfferingId; no join-code secrets. */
public final class OpeningRequestModels {
    private OpeningRequestModels() { }
    public record Submit(
            @NotBlank @Size(max=50) @Pattern(regexp="(?i)[A-Z0-9][A-Z0-9._-]*") String subjectCode,
            @NotBlank @Size(max=255) String subjectName,
            @NotNull @Min(1) @Max(30) Integer credits,
            @NotNull UUID semesterId,
            @NotBlank @Size(max=50) @Pattern(regexp="(?i)[A-Z0-9][A-Z0-9._-]*") String code,
            @Size(max=255) String name) { }
    public record Approve(UUID subjectId, @Size(max=50) String subjectCode,
                          @Size(max=255) String subjectName, @Min(1) @Max(30) Integer credits) { }
    public record Reject(@NotBlank @Size(max=1000) String reason) { }
    public record OpeningRequest(UUID id, UUID teacherId, String teacherName, String subjectCode,
            String subjectName, int credits, UUID semesterId, String semesterName, String code,
            String name, String status, UUID courseOfferingId, String decisionReason,
            Instant createdAt, Instant decidedAt) { }
    public record Page(List<OpeningRequest> items, int page, int size, long totalItems, int totalPages) { }
}
