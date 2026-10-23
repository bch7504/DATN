package com.studyflow.review.application;

import java.util.UUID;

/**
 * Grounding citation pointing directly to document and page.
 */
public record QuizCitationSourceDTO(
        UUID documentId,
        int pageNumber,
        String excerpt
) {}
