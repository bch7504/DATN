package com.studyflow.document.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/** Offering IDs selected by the authenticated Teacher for a document. */
public record PublishDocumentsRequest(
        @NotNull @Size(max = 100) List<@NotNull UUID> courseOfferingIds) { }
