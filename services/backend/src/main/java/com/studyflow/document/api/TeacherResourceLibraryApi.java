package com.studyflow.document.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Typed public contract for Teacher-owned resource collections. */
public final class TeacherResourceLibraryApi {
    private TeacherResourceLibraryApi() { }

    public record CreateRequest(
            @NotBlank @Size(max = 120) String name,
            UUID subjectId
    ) { }

    public record AddItemRequest(
            @NotBlank @Pattern(regexp = "DOCUMENT|QUIZ|ASSIGNMENT") String itemType,
            UUID itemId
    ) { }

    public record Item(UUID id, String itemType, UUID itemId, String title, String status, Instant addedAt) { }

    public record Library(
            UUID id,
            String name,
            String libraryType,
            UUID subjectId,
            String subjectCode,
            String subjectName,
            List<Item> items,
            Instant createdAt
    ) { }
}
