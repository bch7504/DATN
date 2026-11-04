package com.studyflow.note.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** PUT page-note body. Empty content is valid and clears the persisted note. */
public record SavePageNoteRequest(
        @NotNull @Size(max = 5000) String content
) { }
