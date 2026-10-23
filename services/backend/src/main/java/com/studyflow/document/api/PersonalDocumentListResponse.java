package com.studyflow.document.api;

import java.util.List;

/** Page-zero response because the MVP Personal PDF library is intentionally bounded per owner. */
public record PersonalDocumentListResponse(
        List<PersonalDocumentResponse> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) { }
