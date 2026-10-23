package com.studyflow.document.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.document.api.PersonalDocumentResponse;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.integration.ai.AiContracts.DeindexDocumentRequest;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.integration.ai.AiServiceException;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

/** Owns Student Personal PDF metadata, validation, private storage and safe deindex deletion. */
@Service
public class PersonalDocumentService {
    private static final long MAX_BYTES = 20L * 1024 * 1024;
    private static final String PIPELINE_VERSION = "pdf-v1";

    private final CourseMaterialDocumentRepository documents;
    private final ObjectProvider<AssignmentAttachmentStorage> storageProvider;
    private final ObjectProvider<AiServiceClient> aiProvider;
    private final Clock clock;

    /**
     * Args: document repository, optional storage/AI adapters and application clock.
     * Input: Spring-managed dependencies. Output: owner-scoped Personal PDF service. Errors: none.
     */
    public PersonalDocumentService(
            CourseMaterialDocumentRepository documents,
            ObjectProvider<AssignmentAttachmentStorage> storageProvider,
            ObjectProvider<AiServiceClient> aiProvider,
            Clock clock
    ) {
        this.documents = documents;
        this.storageProvider = storageProvider;
        this.aiProvider = aiProvider;
        this.clock = clock;
    }

    /**
     * Args: authenticated Student ID and one multipart file. Input: PDF <=20 MiB with a text layer.
     * Output: PENDING_PROCESSING metadata. Errors: 409 duplicate, 413 size, 415 type, 422 invalid PDF,
     * 502 storage failure or 503 missing storage. Side effect: stores a private object and metadata.
     */
    @Transactional
    public PersonalDocumentResponse upload(UUID studentId, MultipartFile file) {
        ValidatedPdf pdf = validate(file);
        String hash = sha256(pdf.content());
        if (documents.existsByOwnerIdAndDocumentScopeAndSha256AndDeletedAtIsNull(studentId, "PERSONAL", hash)) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_DOCUMENT",
                    "Tài liệu này đã có trong kho cá nhân của bạn.");
        }
        AssignmentAttachmentStorage storage = requireStorage();
        UUID documentId = UUID.randomUUID();
        String key = "personal-documents/" + studentId + "/" + documentId + ".pdf";
        try {
            storage.put(key, "application/pdf", new ByteArrayInputStream(pdf.content()), pdf.content().length);
        } catch (IOException | RuntimeException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "DOCUMENT_STORAGE_FAILED",
                    "Không thể lưu tài liệu cá nhân.");
        }
        boolean cleanupRegistered = registerRollbackCleanup(storage, key);
        Instant now = clock.instant();
        CourseMaterialDocument document = CourseMaterialDocument.personal(
                documentId,
                studentId,
                pdf.fileName(),
                displayName(pdf.fileName()),
                key,
                pdf.content().length,
                pdf.pageCount(),
                hash,
                now);
        try {
            return response(documents.save(document));
        } catch (RuntimeException exception) {
            if (!cleanupRegistered) safeDelete(storage, key);
            throw exception;
        }
    }

    /** Args: authenticated Student ID. Input: owner scope. Output: newest-first Personal PDF metadata. Errors: repository failures. */
    @Transactional(readOnly = true)
    public List<PersonalDocumentResponse> list(UUID studentId) {
        return documents.findByOwnerIdAndDocumentScopeAndDeletedAtIsNullOrderByCreatedAtDesc(
                        studentId, "PERSONAL").stream()
                .map(PersonalDocumentService::response)
                .toList();
    }

    /** Args: authenticated Student and document IDs. Input: owner scope. Output: current status metadata. Errors: 404 for foreign/missing PDF. */
    @Transactional(readOnly = true)
    public PersonalDocumentResponse status(UUID studentId, UUID documentId) {
        return response(requireOwned(studentId, documentId));
    }

    /**
     * Args: authenticated Student, owned Personal PDF and request ID. Input: exact active version.
     * Output: void/HTTP 204. Errors: 404 missing, 502/503 if safe vector revocation cannot be accepted.
     * Side effect: immediately disables retrieval, soft-deletes metadata and deletes the object after commit.
     */
    @Transactional
    public void delete(UUID studentId, UUID documentId, String requestId) {
        CourseMaterialDocument document = requireOwned(studentId, documentId);
        AssignmentAttachmentStorage storage = requireStorage();
        if ("READY".equals(document.getProcessingStatus()) || "PROCESSING".equals(document.getProcessingStatus())) {
            AiServiceClient ai = aiProvider.getIfAvailable();
            if (ai == null) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_NOT_CONFIGURED",
                        "Chưa thể thu hồi chỉ mục AI của tài liệu.");
            }
            try {
                ai.deindexDocument(
                        new DeindexDocumentRequest(documentId, document.getDocumentVersion(), PIPELINE_VERSION),
                        requestId,
                        documentId + ":" + document.getDocumentVersion() + ":" + PIPELINE_VERSION + ":deindex");
            } catch (AiServiceException exception) {
                HttpStatus status = exception.statusCode() == 503 ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
                throw new ApiException(status, exception.code(), "Chưa thể thu hồi chỉ mục AI của tài liệu.");
            }
        }
        Instant now = clock.instant();
        document.markDeleting(now);
        document.softDelete(now);
        registerAfterCommitDelete(storage, document.getStorageKey());
    }

    private CourseMaterialDocument requireOwned(UUID ownerId, UUID documentId) {
        return documents.findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(
                        documentId, ownerId, "PERSONAL")
                .orElseThrow(() -> new ResourceNotFoundException(
                        "DOCUMENT_NOT_FOUND", "Không tìm thấy tài liệu cá nhân."));
    }

    private static ValidatedPdf validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("INVALID_FILE", "Vui lòng chọn tệp PDF.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "PDF vượt giới hạn 20 MB.");
        }
        String original = file.getOriginalFilename();
        if (original == null || !original.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                    "Chỉ nhận PDF có lớp văn bản.");
        }
        try {
            byte[] content = file.getBytes();
            if (content.length < 5 || content[0] != '%' || content[1] != 'P'
                    || content[2] != 'D' || content[3] != 'F' || content[4] != '-') {
                throw new ValidationException("INVALID_PDF", "Tệp tải lên không phải PDF hợp lệ.");
            }
            try (PDDocument document = Loader.loadPDF(content)) {
                int pageCount = document.getNumberOfPages();
                if (pageCount < 1 || new PDFTextStripper().getText(document).isBlank()) {
                    throw new ValidationException("PDF_TEXT_REQUIRED",
                            "PDF phải có lớp văn bản; không nhận PDF scan.");
                }
                return new ValidatedPdf(content, sanitizeFileName(original), pageCount);
            }
        } catch (IOException exception) {
            throw new ValidationException("INVALID_PDF",
                    "Không thể đọc tệp PDF hoặc tệp đang được bảo vệ bằng mật khẩu.");
        }
    }

    private AssignmentAttachmentStorage requireStorage() {
        AssignmentAttachmentStorage storage = storageProvider.getIfAvailable();
        if (storage == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_NOT_CONFIGURED",
                    "Chức năng tệp chưa được cấu hình lưu trữ.");
        }
        return storage;
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static String sanitizeFileName(String input) {
        String name = input.replaceAll("[\\r\\n\\\\/]+", "_").trim();
        if (name.isEmpty()) name = "document.pdf";
        return name.length() <= 255 ? name : name.substring(name.length() - 255);
    }

    private static String displayName(String fileName) {
        String value = fileName.replaceFirst("(?i)\\.pdf$", "").trim();
        if (value.isEmpty()) value = "Tài liệu cá nhân";
        return value.length() <= 200 ? value : value.substring(0, 200);
    }

    private static PersonalDocumentResponse response(CourseMaterialDocument document) {
        return new PersonalDocumentResponse(
                document.getId(), document.getDisplayName(), document.getFileName(), document.getFileSize(),
                document.getPageCount(), document.getProcessingStatus(), document.getSha256(),
                document.getCreatedAt(), document.getAiErrorCode());
    }

    private static boolean registerRollbackCleanup(AssignmentAttachmentStorage storage, String key) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return false;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == TransactionSynchronization.STATUS_ROLLED_BACK) safeDelete(storage, key);
            }
        });
        return true;
    }

    private static void registerAfterCommitDelete(AssignmentAttachmentStorage storage, String key) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safeDelete(storage, key);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() { safeDelete(storage, key); }
        });
    }

    private static void safeDelete(AssignmentAttachmentStorage storage, String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException ignored) {
            org.slf4j.LoggerFactory.getLogger(PersonalDocumentService.class)
                    .warn("Personal document object cleanup failed; reconciliation is required.");
        }
    }

    private record ValidatedPdf(byte[] content, String fileName, int pageCount) { }
}
