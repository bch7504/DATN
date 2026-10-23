package com.studyflow.document.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.integration.ai.AiContracts.IndexArtifact;
import com.studyflow.integration.ai.AiContracts.JobAcceptedResponse;
import com.studyflow.integration.ai.AiContracts.JobResponse;
import com.studyflow.integration.ai.AiContracts.JobStatus;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

/** Synthetic lifecycle tests; no real PDF, provider, network, object store or vector is used. */
class DocumentIndexingServiceTest {
    private final Instant now = Instant.parse("2026-10-22T00:00:00Z");
    private final CourseMaterialDocumentRepository documents = mock(CourseMaterialDocumentRepository.class);
    private final AssignmentAttachmentStorage storage = mock(AssignmentAttachmentStorage.class);
    private final AiServiceClient ai = mock(AiServiceClient.class);
    private DocumentIndexingService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ObjectProvider<AssignmentAttachmentStorage> storageProvider = mock(ObjectProvider.class);
        ObjectProvider<AiServiceClient> aiProvider = mock(ObjectProvider.class);
        when(storageProvider.getIfAvailable()).thenReturn(storage);
        when(aiProvider.getIfAvailable()).thenReturn(ai);
        service = new DocumentIndexingService(
                documents, storageProvider, aiProvider, Clock.fixed(now, ZoneOffset.UTC), false);
    }

    /** Valid HTTPS input is sent with structured scope and moves the Java record to PROCESSING. */
    @Test
    void enqueuesValidPendingDocument() {
        CourseMaterialDocument document = pendingDocument();
        UUID jobId = UUID.randomUUID();
        when(documents.findTop20ByProcessingStatusAndDeletedAtIsNullOrderByUpdatedAtAsc("PENDING_PROCESSING"))
                .thenReturn(List.of(document));
        when(storage.presignGet(anyString(), any())).thenReturn(URI.create("https://storage.example.test/signed.pdf"));
        when(ai.indexDocument(any(), anyString(), anyString())).thenReturn(
                new JobAcceptedResponse("ignored-by-coordinator", jobId, JobStatus.PENDING));

        service.enqueuePending();

        assertThat(document.getProcessingStatus()).isEqualTo("PROCESSING");
        assertThat(document.getAiJobId()).isEqualTo(jobId);
    }

    /** Non-HTTPS signed URLs never cross the Java-Python boundary and produce a safe code. */
    @Test
    void rejectsUnsafeSignedUrl() {
        CourseMaterialDocument document = pendingDocument();
        when(documents.findTop20ByProcessingStatusAndDeletedAtIsNullOrderByUpdatedAtAsc("PENDING_PROCESSING"))
                .thenReturn(List.of(document));
        when(storage.presignGet(anyString(), any())).thenReturn(URI.create("http://storage.example.test/signed.pdf"));

        service.enqueuePending();

        assertThat(document.getProcessingStatus()).isEqualTo("FAILED");
        assertThat(document.getAiErrorCode()).isEqualTo("INDEX_CONFIGURATION_INVALID");
        verify(ai, never()).indexDocument(any(), anyString(), anyString());
    }

    /** Explicit local mode accepts loopback HTTP without weakening the production default. */
    @Test
    @SuppressWarnings("unchecked")
    void acceptsLoopbackHttpWhenLocalModeIsEnabled() {
        ObjectProvider<AssignmentAttachmentStorage> storageProvider = mock(ObjectProvider.class);
        ObjectProvider<AiServiceClient> aiProvider = mock(ObjectProvider.class);
        when(storageProvider.getIfAvailable()).thenReturn(storage);
        when(aiProvider.getIfAvailable()).thenReturn(ai);
        service = new DocumentIndexingService(
                documents, storageProvider, aiProvider, Clock.fixed(now, ZoneOffset.UTC), true);
        CourseMaterialDocument document = pendingDocument();
        UUID jobId = UUID.randomUUID();
        when(documents.findTop20ByProcessingStatusAndDeletedAtIsNullOrderByUpdatedAtAsc("PENDING_PROCESSING"))
                .thenReturn(List.of(document));
        when(storage.presignGet(anyString(), any())).thenReturn(URI.create("http://127.0.0.1:8333/signed.pdf"));
        when(ai.indexDocument(any(), anyString(), anyString())).thenReturn(
                new JobAcceptedResponse("ignored-by-coordinator", jobId, JobStatus.PENDING));

        service.enqueuePending();

        assertThat(document.getProcessingStatus()).isEqualTo("PROCESSING");
        verify(ai).indexDocument(any(), anyString(), anyString());
    }

    /** Matching schema-v3 artifact metadata moves PROCESSING to READY and trusts extracted page count only. */
    @Test
    void completesSuccessfulJob() {
        CourseMaterialDocument document = pendingDocument();
        UUID jobId = UUID.randomUUID();
        document.markProcessing(jobId, now.minusSeconds(1));
        when(documents.findTop20ByProcessingStatusAndDeletedAtIsNullOrderByUpdatedAtAsc("PROCESSING"))
                .thenReturn(List.of(document));
        when(ai.getJob(jobId, "doc-poll-" + document.getId())).thenReturn(new JobResponse(
                "doc-poll-" + document.getId(), jobId, JobStatus.SUCCEEDED, 1, null,
                new IndexArtifact(12, 24, "openai/text-embedding-3-large", 1024, "pdf-v1")));

        service.pollProcessing();

        assertThat(document.getProcessingStatus()).isEqualTo("READY");
        assertThat(document.getPageCount()).isEqualTo(12);
        assertThat(document.getIndexedAt()).isEqualTo(now);
    }

    private CourseMaterialDocument pendingDocument() {
        return new CourseMaterialDocument(
                UUID.randomUUID(), UUID.randomUUID(), "synthetic.pdf", "Synthetic",
                "course-materials/synthetic.pdf", 128, 2, now.minusSeconds(5));
    }
}
