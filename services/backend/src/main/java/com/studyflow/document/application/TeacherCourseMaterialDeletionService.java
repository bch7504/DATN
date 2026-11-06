package com.studyflow.document.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.document.domain.TeacherResourceLibraryItemRepository;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.integration.ai.AiServiceException;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.publication.domain.DocumentPublication;
import com.studyflow.publication.domain.DocumentPublicationRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static com.studyflow.integration.ai.AiContracts.DeindexDocumentRequest;

/** Safely revokes and removes one Teacher-owned Course Material without leaving active AI evidence. */
@Service
public class TeacherCourseMaterialDeletionService {
    private static final String PIPELINE_VERSION = "pdf-v1";
    private final CourseMaterialDocumentRepository documents;
    private final DocumentPublicationRepository publications;
    private final TeacherResourceLibraryItemRepository libraryItems;
    private final ObjectProvider<AssignmentAttachmentStorage> storageProvider;
    private final ObjectProvider<AiServiceClient> aiProvider;
    private final Clock clock;

    public TeacherCourseMaterialDeletionService(CourseMaterialDocumentRepository documents,
                                                DocumentPublicationRepository publications,
                                                TeacherResourceLibraryItemRepository libraryItems,
                                                ObjectProvider<AssignmentAttachmentStorage> storageProvider,
                                                ObjectProvider<AiServiceClient> aiProvider,
                                                Clock clock) {
        this.documents = documents;
        this.publications = publications;
        this.libraryItems = libraryItems;
        this.storageProvider = storageProvider;
        this.aiProvider = aiProvider;
        this.clock = clock;
    }

    /**
     * Args: authenticated Teacher ID, owned Course Material ID and request trace ID.
     * Input: active COURSE_MATERIAL metadata. SLIDE_PDF deletion requires Python to accept deindexing.
     * Output: void/HTTP 204. Side effects: revokes publications, removes library links, soft-deletes
     * metadata and deletes the private object after commit.
     * Errors: 404 for missing/foreign material; 502/503 when vectors or storage cannot be revoked safely.
     */
    @Transactional
    public void delete(UUID teacherId, UUID documentId, String requestId) {
        CourseMaterialDocument document = documents
                .findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(documentId, teacherId, "COURSE_MATERIAL")
                .orElseThrow(() -> new ResourceNotFoundException(
                        "DOCUMENT_NOT_FOUND", "Không tìm thấy học liệu của giảng viên."));
        AssignmentAttachmentStorage storage = storageProvider.getIfAvailable();
        if (storage == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_NOT_CONFIGURED",
                    "Kho tệp chưa được cấu hình để xóa học liệu an toàn.");
        }
        if (document.isSlidePdf()) {
            requestDeindex(document, requestId);
        }
        Instant now = clock.instant();
        for (DocumentPublication publication : publications.findByDocumentIdAndStatus(documentId, "PUBLISHED")) {
            publication.revoke(now);
        }
        libraryItems.deleteByItemTypeAndItemId("DOCUMENT", documentId);
        document.markDeleting(now);
        document.softDelete(now);
        registerAfterCommitDelete(storage, document.getStorageKey());
    }

    private void requestDeindex(CourseMaterialDocument document, String requestId) {
        AiServiceClient ai = aiProvider.getIfAvailable();
        if (ai == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_NOT_CONFIGURED",
                    "Chưa thể thu hồi chỉ mục AI của học liệu.");
        }
        try {
            ai.deindexDocument(
                    new DeindexDocumentRequest(document.getId(), document.getDocumentVersion(), PIPELINE_VERSION),
                    requestId,
                    document.getId() + ":" + document.getDocumentVersion() + ":" + PIPELINE_VERSION + ":deindex");
        } catch (AiServiceException exception) {
            HttpStatus status = exception.statusCode() == 503
                    ? HttpStatus.SERVICE_UNAVAILABLE
                    : HttpStatus.BAD_GATEWAY;
            throw new ApiException(status, exception.code(),
                    "Chưa thể thu hồi chỉ mục AI của học liệu.");
        }
    }

    private static void registerAfterCommitDelete(AssignmentAttachmentStorage storage, String objectKey) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safeDelete(storage, objectKey);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                safeDelete(storage, objectKey);
            }
        });
    }

    private static void safeDelete(AssignmentAttachmentStorage storage, String objectKey) {
        try {
            storage.delete(objectKey);
        } catch (RuntimeException ignored) {
            LoggerFactory.getLogger(TeacherCourseMaterialDeletionService.class)
                    .warn("Teacher Course Material object cleanup failed; reconciliation is required.");
        }
    }
}
