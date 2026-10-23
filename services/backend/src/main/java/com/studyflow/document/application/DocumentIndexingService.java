package com.studyflow.document.application;

import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.integration.ai.AiContracts.IndexDocumentRequest;
import com.studyflow.integration.ai.AiContracts.JobResponse;
import com.studyflow.integration.ai.AiContracts.JobStatus;
import com.studyflow.integration.ai.AiContracts.SourceType;
import com.studyflow.integration.ai.AiDocumentUrlPolicy;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.integration.ai.AiServiceException;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Coordinates Java-owned document lifecycle with Python-owned PDF indexing jobs. */
@Service
public class DocumentIndexingService {
    private static final String PIPELINE_VERSION = "pdf-v1";
    private static final int EMBEDDING_DIMENSIONS = 1024;
    private static final Duration SIGNED_URL_VALIDITY = Duration.ofMinutes(10);

    private final CourseMaterialDocumentRepository documents;
    private final ObjectProvider<AssignmentAttachmentStorage> storageProvider;
    private final ObjectProvider<AiServiceClient> aiProvider;
    private final Clock clock;
    private final boolean allowInsecureLocalStorageUrl;

    /**
     * Args: document repository, optional private storage, optional Python client, application clock and local HTTP opt-in.
     * Input: Spring-managed infrastructure. Output: reusable indexing coordinator. Errors: none.
     */
    public DocumentIndexingService(
            CourseMaterialDocumentRepository documents,
            ObjectProvider<AssignmentAttachmentStorage> storageProvider,
            ObjectProvider<AiServiceClient> aiProvider,
            Clock clock,
            @org.springframework.beans.factory.annotation.Value(
                    "${studyflow.ai.allow-insecure-local-storage-url:false}")
            boolean allowInsecureLocalStorageUrl
    ) {
        this.documents = documents;
        this.storageProvider = storageProvider;
        this.aiProvider = aiProvider;
        this.clock = clock;
        this.allowInsecureLocalStorageUrl = allowInsecureLocalStorageUrl;
    }

    /**
     * Args: none. Input: at most twenty active PENDING_PROCESSING PDF records.
     * Output: void; accepted records become PROCESSING. Errors: unavailable dependencies leave records pending;
     * invalid deployment/protocol responses mark a record FAILED without storing raw downstream messages.
     */
    @Transactional
    public void enqueuePending() {
        AssignmentAttachmentStorage storage = storageProvider.getIfAvailable();
        AiServiceClient ai = aiProvider.getIfAvailable();
        if (storage == null || ai == null) return;

        for (CourseMaterialDocument document : documents
                .findTop20ByProcessingStatusAndDeletedAtIsNullOrderByUpdatedAtAsc("PENDING_PROCESSING")) {
            String requestId = requestId("index", document.getId());
            try {
                URI signedUrl = storage.presignGet(document.getStorageKey(), SIGNED_URL_VALIDITY);
                AiDocumentUrlPolicy.requireAllowed(signedUrl, allowInsecureLocalStorageUrl);
                var accepted = ai.indexDocument(new IndexDocumentRequest(
                                document.getId(),
                                document.getDocumentVersion(),
                                PIPELINE_VERSION,
                                document.getOwnerId(),
                                sourceType(document),
                                signedUrl,
                                document.getMimeType()),
                        requestId,
                        document.getId() + ":" + document.getDocumentVersion() + ":" + PIPELINE_VERSION + ":index");
                document.markProcessing(accepted.jobId(), clock.instant());
            } catch (AiServiceException exception) {
                if (exception.statusCode() != 503) document.markFailed(safeCode(exception.code()), clock.instant());
            } catch (IllegalArgumentException | UnsupportedOperationException exception) {
                document.markFailed("INDEX_CONFIGURATION_INVALID", clock.instant());
            } catch (RuntimeException exception) {
                // Object storage may be temporarily unavailable. Keep the job pending for a later scan.
            }
        }
    }

    /**
     * Args: none. Input: at most twenty active PROCESSING records with Python job IDs.
     * Output: void; successful jobs become READY and failed jobs become FAILED. Errors: a temporary Python
     * outage leaves the record PROCESSING so the next scan can retry safely.
     */
    @Transactional
    public void pollProcessing() {
        AiServiceClient ai = aiProvider.getIfAvailable();
        if (ai == null) return;

        for (CourseMaterialDocument document : documents
                .findTop20ByProcessingStatusAndDeletedAtIsNullOrderByUpdatedAtAsc("PROCESSING")) {
            if (document.getAiJobId() == null) {
                document.markFailed("INDEX_JOB_ID_MISSING", clock.instant());
                continue;
            }
            try {
                JobResponse job = ai.getJob(document.getAiJobId(), requestId("poll", document.getId()));
                if (job.status() == JobStatus.SUCCEEDED) {
                    if (job.artifact() == null
                            || !PIPELINE_VERSION.equals(job.artifact().pipelineVersion())
                            || job.artifact().embeddingDimensions() != EMBEDDING_DIMENSIONS) {
                        document.markFailed("INDEX_ARTIFACT_MISMATCH", clock.instant());
                    } else {
                        document.markReady(job.artifact().pageCount(), clock.instant());
                    }
                } else if (job.status() == JobStatus.FAILED) {
                    document.markFailed(safeCode(job.errorCode()), clock.instant());
                }
            } catch (AiServiceException exception) {
                if (exception.statusCode() != 503) document.markFailed(safeCode(exception.code()), clock.instant());
            } catch (IllegalArgumentException exception) {
                document.markFailed("INDEX_RESPONSE_INVALID", clock.instant());
            }
        }
    }

    private static SourceType sourceType(CourseMaterialDocument document) {
        return "PERSONAL".equals(document.getDocumentScope())
                ? SourceType.PERSONAL_PDF
                : SourceType.COURSE_MATERIAL_PDF;
    }

    private static String requestId(String operation, UUID documentId) {
        return "doc-" + operation + "-" + documentId;
    }

    private static String safeCode(String value) {
        if (value == null || value.isBlank()) return "AI_INDEX_FAILED";
        String normalized = value.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]+", "_");
        if (normalized.isBlank()) return "AI_INDEX_FAILED";
        return normalized.length() <= 80 ? normalized : normalized.substring(0, 80);
    }
}
