package com.studyflow.document.api;

import java.util.List;

/** Standard paginated response for document lists. */
public record DocumentListResponse(List<TeacherDocumentResponse> items, int page, int size,
                                   long totalItems, int totalPages) { }
