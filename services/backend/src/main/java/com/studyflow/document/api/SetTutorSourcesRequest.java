package com.studyflow.document.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/** Complete replacement of supporting PDFs linked to one primary slide in one class. */
public record SetTutorSourcesRequest(
        @NotNull UUID courseOfferingId,
        @NotNull @Size(max = 10) List<@NotNull UUID> supportingDocumentIds) { }
