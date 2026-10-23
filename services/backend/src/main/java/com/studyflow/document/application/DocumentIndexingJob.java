package com.studyflow.document.application;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodically advances PDF indexing without moving business ownership into Python. */
@Component
public class DocumentIndexingJob {
    private final DocumentIndexingService indexingService;

    /** Args: indexing coordinator. Input: Spring service. Output: scheduled job component. Errors: none. */
    public DocumentIndexingJob(DocumentIndexingService indexingService) {
        this.indexingService = indexingService;
    }

    /**
     * Args: none. Input: active pending/processing documents. Output: void.
     * Retry/idempotency: fixed-delay scans and stable operation keys make repeated execution safe.
     * Side effect: submits or polls Python jobs and updates document status.
     */
    @Scheduled(fixedDelayString = "${studyflow.ai.document-scan-delay:10000}")
    public void advanceDocumentJobs() {
        indexingService.enqueuePending();
        indexingService.pollProcessing();
    }
}
