package com.studyflow.notification.api;

import java.util.List;

public record NotificationPageResponse(
        List<NotificationResponse> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {
}
