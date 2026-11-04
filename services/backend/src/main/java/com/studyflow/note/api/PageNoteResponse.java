package com.studyflow.note.api;

import java.time.Instant;
import java.util.UUID;

/** Owner-scoped page note response; updatedAt is null when no note has been saved. */
public record PageNoteResponse(UUID documentId, int pageNumber, String content, Instant updatedAt) { }
