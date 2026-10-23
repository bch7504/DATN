package com.studyflow.document.application;

import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.document.api.TeacherDocumentResponse;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.notification.domain.NotificationType;
import com.studyflow.publication.domain.DocumentPublication;
import com.studyflow.publication.domain.DocumentPublicationRepository;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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

/**
 * Owns Course Material upload, publication, and student access decisions.
 * Contract: methods receive authenticated IDs and bounded multipart/request data; outputs are
 * safe metadata or authorized streams; errors are documented per method and no storage key is public.
 */
@Service
public class CourseMaterialLibraryService {
    private static final long MAX_BYTES = 20L * 1024 * 1024;
    private final CourseMaterialDocumentRepository documents;
    private final DocumentPublicationRepository publications;
    private final CourseOfferingRepository offerings;
    private final CourseEnrollmentRepository enrollments;
    private final ObjectProvider<AssignmentAttachmentStorage> storageProvider;
    private final NotificationStore notifications;
    private final Clock clock;

    public CourseMaterialLibraryService(CourseMaterialDocumentRepository documents,
                                        DocumentPublicationRepository publications,
                                        CourseOfferingRepository offerings,
                                        CourseEnrollmentRepository enrollments,
                                        ObjectProvider<AssignmentAttachmentStorage> storageProvider,
                                        NotificationStore notifications,
                                        Clock clock) {
        this.documents = documents;
        this.publications = publications;
        this.offerings = offerings;
        this.enrollments = enrollments;
        this.storageProvider = storageProvider;
        this.notifications = notifications;
        this.clock = clock;
    }

    /**
     * Args: authenticated teacherId, uploaded PDF, and display title (1–200 chars).
     * Input: PDF <=20 MiB with a readable text layer and at least one page. Output: saved READY metadata.
     * Errors: 413 oversized, 422 invalid/title/scan PDF, 502 storage failure, 503 storage unavailable.
     * Side effect: stores a private object and inserts its metadata; confirmed transaction rollback
     * attempts object cleanup, including failures during commit. Cleanup failure never hides the DB error.
     */
    @Transactional
    public CourseMaterialDocument upload(UUID teacherId, MultipartFile file, String title) {
        if (file == null || file.isEmpty()) throw new ValidationException("INVALID_FILE", "Vui lòng chọn tệp PDF.");
        if (file.getSize() > MAX_BYTES) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "PDF vượt giới hạn 20 MB.");
        if (file.getOriginalFilename() == null || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", "Chỉ nhận PDF có lớp văn bản.");
        }
        String cleanTitle = title == null ? "" : title.trim();
        if (cleanTitle.isEmpty() || cleanTitle.length() > 200) throw new ValidationException("INVALID_TITLE", "Tiêu đề phải có từ 1 đến 200 ký tự.");
        byte[] content;
        int pageCount;
        try {
            content = file.getBytes();
            if (content.length < 5 || content[0] != '%' || content[1] != 'P' || content[2] != 'D' || content[3] != 'F' || content[4] != '-') {
                throw new ValidationException("INVALID_PDF", "Tệp tải lên không phải PDF hợp lệ.");
            }
            try (PDDocument pdf = Loader.loadPDF(content)) {
                pageCount = pdf.getNumberOfPages();
                if (pageCount == 0 || new PDFTextStripper().getText(pdf).isBlank()) {
                    throw new ValidationException("PDF_TEXT_REQUIRED", "PDF phải có lớp văn bản; không nhận PDF scan.");
                }
            }
        } catch (IOException exception) {
            throw new ValidationException("INVALID_PDF", "Không thể đọc tệp PDF hoặc tệp đang được bảo vệ bằng mật khẩu.");
        }
        AssignmentAttachmentStorage storage = requireStorage();
        UUID id = UUID.randomUUID();
        String objectKey = "course-materials/" + teacherId + "/" + id + ".pdf";
        try {
            storage.put(objectKey, "application/pdf", new ByteArrayInputStream(content), content.length);
        } catch (IOException | RuntimeException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "DOCUMENT_STORAGE_FAILED", "Không thể lưu tệp học liệu.");
        }
        boolean cleanupRegistered = registerRollbackCleanup(storage, objectKey);
        Instant now = clock.instant();
        CourseMaterialDocument document = new CourseMaterialDocument(id, teacherId,
                sanitizeFileName(file.getOriginalFilename()), cleanTitle, objectKey, content.length, pageCount, now);
        try {
            CourseMaterialDocument saved = documents.save(document);
            notifications.createEventIfAbsent(teacherId, NotificationType.TEACHER_MATERIAL_UPLOADED,
                    "Đã tải học liệu PDF", "Học liệu “" + cleanTitle + "” đã được lưu vào kho riêng. Chọn lớp để công bố.",
                    "COURSE_MATERIAL", id, null, now, false);
            return saved;
        } catch (RuntimeException exception) {
            if (!cleanupRegistered) deleteAfterFailedUpload(storage, objectKey);
            throw exception;
        }
    }

    /**
     * Args: configured storage and the new private object key, both required. Input: successful upload.
     * Output: true if rollback cleanup is registered, false outside a Spring transaction. Errors: none
     * during cleanup. Unknown completion leaves the object intact to avoid deleting committed data.
     */
    private static boolean registerRollbackCleanup(AssignmentAttachmentStorage storage, String objectKey) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return false;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            /** Args: Spring completion status. Output: void; deletes only after confirmed rollback. Errors: contained. */
            @Override
            public void afterCompletion(int status) {
                if (status == TransactionSynchronization.STATUS_ROLLED_BACK) {
                    deleteAfterFailedUpload(storage, objectKey);
                }
            }
        });
        return true;
    }

    /** Args: required storage/key of failed upload. Output: void, best-effort deletion. Errors: contained, no sensitive logging. */
    private static void deleteAfterFailedUpload(AssignmentAttachmentStorage storage, String objectKey) {
        try {
            storage.delete(objectKey);
        } catch (RuntimeException ignored) {
            org.slf4j.LoggerFactory.getLogger(CourseMaterialLibraryService.class)
                    .warn("Course material rollback cleanup failed; object reconciliation required.");
        }
    }

    /** Args: authenticated teacherId. Input: none. Output: owned non-deleted documents with active publications. Errors: storage-independent repository failure. */
    @Transactional(readOnly = true)
    public List<TeacherDocumentResponse> listTeacher(UUID teacherId) {
        return documents.findByOwnerIdAndDocumentScopeAndDeletedAtIsNullOrderByCreatedAtDesc(
                        teacherId, "COURSE_MATERIAL").stream()
                .map(document -> response(document, publications.findByDocumentIdAndStatus(document.getId(), "PUBLISHED")))
                .toList();
    }

    /**
     * Args: authenticated teacherId, documentId, required selected offering IDs (0–100, no nulls/duplicates).
     * Input: every target offering must be active and owned by this teacher. Output: void.
     * Errors: 403 non-owner, 404 missing document/offering, 409 inactive offering, 422 invalid selection.
     * Side effect: validates all targets before updates; publishes selected classes and revokes omitted
     * classes. Repeating an unchanged selection preserves the original publication timestamp.
     */
    @Transactional
    public void setPublications(UUID teacherId, UUID documentId, List<UUID> selectedOfferingIds) {
        CourseMaterialDocument document = requireOwned(teacherId, documentId);
        if (!"READY".equals(document.getProcessingStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "DOCUMENT_NOT_READY",
                    "Học liệu chưa sẵn sàng để công bố.");
        }
        if (selectedOfferingIds == null || selectedOfferingIds.size() > 100 || selectedOfferingIds.stream().anyMatch(java.util.Objects::isNull)) {
            throw new ValidationException("INVALID_OFFERING_SELECTION", "Danh sách lớp phải có tối đa 100 mã lớp hợp lệ.");
        }
        List<UUID> ids = new ArrayList<>(new LinkedHashSet<>(selectedOfferingIds));
        if (ids.size() != selectedOfferingIds.size()) {
            throw new ValidationException("DUPLICATE_OFFERING", "Không được chọn trùng lớp học phần.");
        }
        Instant now = clock.instant();
        for (UUID offeringId : ids) {
            CourseOffering offering = offerings.findById(offeringId).orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
            if (!offering.isOwnedBy(teacherId)) throw new ForbiddenException("FORBIDDEN", "Bạn không sở hữu lớp học phần đã chọn.");
            if (offering.getStatus() != CourseOfferingStatus.ACTIVE) throw new ApiException(HttpStatus.CONFLICT, "COURSE_NOT_ACTIVE", "Chỉ công bố vào lớp đang hoạt động.");
        }
        for (UUID offeringId : ids) {
            var existingPublication = publications.findByDocumentIdAndCourseOfferingId(documentId, offeringId);
            DocumentPublication publication = existingPublication
                    .orElseGet(() -> new DocumentPublication(UUID.randomUUID(), documentId, offeringId, teacherId, now));
            boolean newlyPublished = existingPublication
                    .map(existing -> !"PUBLISHED".equals(existing.getStatus())).orElse(true);
            if (!"PUBLISHED".equals(publication.getStatus())) publication.publish(teacherId, now);
            publications.save(publication);
            if (newlyPublished) notifyPublication(teacherId, document, offeringId, publication, now);
        }
        publications.findByDocumentIdAndStatus(documentId, "PUBLISHED").stream()
                .filter(publication -> !ids.contains(publication.getCourseOfferingId()))
                .forEach(publication -> revokeAndNotify(teacherId, document, publication, now));
    }

    /**
     * Args: authenticated teacherId, owned documentId and offeringId. Input: existing publication.
     * Output: void. Errors: 403 non-owner, 404 missing document/offering/publication.
     * Side effect: marks publication REVOKED so new Student access is denied immediately.
     */
    @Transactional
    public void revokePublication(UUID teacherId, UUID documentId, UUID offeringId) {
        CourseMaterialDocument document = requireOwned(teacherId, documentId);
        DocumentPublication publication = publications.findByDocumentIdAndCourseOfferingId(documentId, offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("PUBLICATION_NOT_FOUND", "Không tìm thấy lượt công bố."));
        if ("PUBLISHED".equals(publication.getStatus())) {
            revokeAndNotify(teacherId, document, publication, clock.instant());
        }
    }

    /**
     * Args: owner, owned PDF, class and active publication with event time. Input: newly published class.
     * Output: void; adds one owner notice and notices/email for currently approved Students.
     * Errors: persistence failure rolls back publication and all notices.
     */
    private void notifyPublication(UUID teacherId, CourseMaterialDocument document, UUID offeringId,
                                   DocumentPublication publication, Instant now) {
        UUID eventId = publicationEventId(publication, "published");
        String title = document.getDisplayName();
        notifications.createEventIfAbsent(teacherId, NotificationType.TEACHER_MATERIAL_PUBLISHED,
                "Đã công bố học liệu", "Học liệu “" + title + "” đã được công bố vào lớp.",
                "DOCUMENT_PUBLICATION", eventId, null, now, false);
        for (var enrollment : enrollments.findByCourseOfferingIdAndStatus(offeringId, EnrollmentStatus.APPROVED)) {
            notifications.createEventIfAbsent(enrollment.getStudentId(), NotificationType.STUDENT_MATERIAL_PUBLISHED,
                    "Học liệu mới", "Giảng viên đã công bố học liệu “" + title + "” trong lớp của bạn.",
                    "DOCUMENT_PUBLICATION", eventId, null, now, true);
        }
    }

    /** Args: owner/PDF/active publication and time. Input: currently visible class. Output: void; revokes and notifies approved users. Errors: persistence rollback. */
    private void revokeAndNotify(UUID teacherId, CourseMaterialDocument document,
                                 DocumentPublication publication, Instant now) {
        publication.revoke(now);
        publications.save(publication);
        UUID eventId = publicationEventId(publication, "revoked:" + now);
        notifications.createEventIfAbsent(teacherId, NotificationType.TEACHER_MATERIAL_REVOKED,
                "Đã thu hồi học liệu", "Học liệu “" + document.getDisplayName() + "” đã được thu hồi khỏi lớp.",
                "DOCUMENT_PUBLICATION", eventId, null, now, false);
        for (var enrollment : enrollments.findByCourseOfferingIdAndStatus(
                publication.getCourseOfferingId(), EnrollmentStatus.APPROVED)) {
            notifications.createEventIfAbsent(enrollment.getStudentId(), NotificationType.STUDENT_MATERIAL_REVOKED,
                    "Học liệu đã thu hồi", "Học liệu “" + document.getDisplayName() + "” không còn được công bố trong lớp.",
                    "DOCUMENT_PUBLICATION", eventId, null, now, true);
        }
    }

    /** Args: publication and event discriminator. Input: persisted publication lifecycle. Output: stable UUID for one event; errors: none. */
    private static UUID publicationEventId(DocumentPublication publication, String event) {
        return UUID.nameUUIDFromBytes((publication.getId() + ":" + publication.getPublishedAt() + ":" + event)
                .getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Args: authenticated studentId and optional offeringId. Input: the requested class, if present,
     * must have an APPROVED enrollment. Output: only PDFs published to the student's approved classes.
     * Errors: 403 enrollment required; 404 unknown class. Side effect: none.
     */
    @Transactional(readOnly = true)
    public List<TeacherDocumentResponse> listStudent(UUID studentId, UUID offeringId) {
        Set<UUID> approvedOfferingIds = new LinkedHashSet<>(enrollments
                .findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED).stream()
                .map(enrollment -> enrollment.getCourseOfferingId()).toList());
        if (offeringId != null) {
            CourseOffering offering = offerings.findById(offeringId).orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
            if (!approvedOfferingIds.contains(offeringId)) throw new ForbiddenException("ENROLLMENT_REQUIRED", "Bạn chưa được duyệt vào lớp học phần này.");
            approvedOfferingIds = Set.of(offeringId);
        }
        if (approvedOfferingIds.isEmpty()) return List.of();
        Set<UUID> allowedOfferingIds = approvedOfferingIds;
        List<TeacherDocumentResponse> results = new ArrayList<>();
        for (UUID id : allowedOfferingIds) {
            CourseOffering offering = offerings.findById(id).orElse(null);
            if (offering == null || offering.getStatus() == CourseOfferingStatus.LOCKED) continue;
            for (DocumentPublication publication : publications.findByCourseOfferingIdAndStatus(id, "PUBLISHED")) {
                documents.findByIdAndDeletedAtIsNull(publication.getDocumentId())
                        .ifPresent(document -> results.add(response(document, List.of(publication))));
            }
        }
        return results.stream().collect(java.util.stream.Collectors.toMap(TeacherDocumentResponse::id, item -> item, (first, next) -> {
            List<TeacherDocumentResponse.PublishedOffering> combined = new ArrayList<>(first.publishedOfferings());
            combined.addAll(next.publishedOfferings());
            return new TeacherDocumentResponse(first.id(), first.title(), first.fileName(), first.fileType(), first.fileSize(), first.status(), first.totalPages(), combined, first.createdAt());
        }, java.util.LinkedHashMap::new)).values().stream().toList();
    }

    /** Args: authenticated teacherId and documentId. Output: file stream owned by that Teacher. Errors: 403/404/503. Side effect: none. */
    @Transactional(readOnly = true)
    public Download downloadForTeacher(UUID teacherId, UUID documentId) {
        return download(requireOwned(teacherId, documentId));
    }

    /** Args: authenticated studentId and documentId. Output: file stream only if an active publication is in an approved class. Errors: 403/404/503. Side effect: none. */
    @Transactional(readOnly = true)
    public Download downloadForStudent(UUID studentId, UUID documentId) {
        CourseMaterialDocument document = documents.findByIdAndDeletedAtIsNull(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("DOCUMENT_NOT_FOUND", "Không tìm thấy học liệu."));
        Set<UUID> approved = new LinkedHashSet<>(enrollments.findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED)
                .stream().map(item -> item.getCourseOfferingId()).toList());
        boolean allowed = publications.findByDocumentIdAndStatus(documentId, "PUBLISHED").stream()
                .map(item -> offerings.findById(item.getCourseOfferingId()).orElse(null))
                .anyMatch(offering -> offering != null && approved.contains(offering.getId()) && offering.getStatus() != CourseOfferingStatus.LOCKED);
        if (!allowed) throw new ForbiddenException("ENROLLMENT_REQUIRED", "Bạn không có quyền xem tài liệu này.");
        return download(document);
    }

    /**
     * Args: authenticated Student, published document and 1-based current page.
     * Input: an existing READY PDF with an active publication in one APPROVED, non-locked class.
     * Output: immutable minimum scope for Course Material Tutor. Errors: 403 missing access,
     * 404 missing PDF, 409 non-ready PDF, 422 page outside the original document.
     */
    @Transactional(readOnly = true)
    public TutorScope authorizeTutor(UUID studentId, UUID documentId, int pageNumber) {
        CourseMaterialDocument document = documents.findByIdAndDeletedAtIsNull(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("DOCUMENT_NOT_FOUND", "Không tìm thấy học liệu."));
        if (!"READY".equals(document.getProcessingStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "DOCUMENT_NOT_READY", "Học liệu chưa sẵn sàng để hỏi đáp.");
        }
        if (pageNumber < 1 || pageNumber > document.getPageCount()) {
            throw new ValidationException("INVALID_PAGE", "Trang tài liệu không hợp lệ.");
        }
        Set<UUID> approved = new LinkedHashSet<>(enrollments
                .findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED).stream()
                .map(item -> item.getCourseOfferingId()).toList());
        UUID offeringId = publications.findByDocumentIdAndStatus(documentId, "PUBLISHED").stream()
                .map(DocumentPublication::getCourseOfferingId)
                .filter(approved::contains)
                .sorted()
                .filter(id -> offerings.findById(id)
                        .map(offering -> offering.getStatus() == CourseOfferingStatus.ACTIVE)
                        .orElse(false))
                .findFirst()
                .orElseThrow(() -> new ForbiddenException(
                        "ENROLLMENT_REQUIRED", "Bạn không có quyền hỏi đáp học liệu này."));
        return new TutorScope(document.getId(), document.getDocumentVersion(), document.getOwnerId(),
                document.getDisplayName(), document.getPageCount(), offeringId);
    }

    private Download download(CourseMaterialDocument document) {
        InputStream content = requireStorage().get(document.getStorageKey());
        return new Download(document.getFileName(), document.getMimeType(), document.getFileSize(), content);
    }

    private AssignmentAttachmentStorage requireStorage() {
        AssignmentAttachmentStorage storage = storageProvider.getIfAvailable();
        if (storage == null) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_NOT_CONFIGURED", "Chức năng tệp chưa được cấu hình lưu trữ.");
        return storage;
    }

    private CourseMaterialDocument requireOwned(UUID teacherId, UUID documentId) {
        CourseMaterialDocument document = documents.findByIdAndDeletedAtIsNull(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("DOCUMENT_NOT_FOUND", "Không tìm thấy học liệu."));
        if (!document.getOwnerId().equals(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Bạn không sở hữu học liệu này.");
        }
        if (!"COURSE_MATERIAL".equals(document.getDocumentScope())) {
            throw new ResourceNotFoundException("DOCUMENT_NOT_FOUND", "Không tìm thấy học liệu.");
        }
        return document;
    }

    private TeacherDocumentResponse response(CourseMaterialDocument document, List<DocumentPublication> active) {
        List<TeacherDocumentResponse.PublishedOffering> offeringDtos = active.stream().map(publication -> {
            CourseOffering offering = offerings.findById(publication.getCourseOfferingId()).orElse(null);
            return offering == null ? null : new TeacherDocumentResponse.PublishedOffering(offering.getId(), offering.getCode(), offering.getName(), publication.getPublishedAt());
        }).filter(java.util.Objects::nonNull).toList();
        return new TeacherDocumentResponse(document.getId(), document.getDisplayName(), document.getFileName(), "PDF",
                document.getFileSize(), document.getProcessingStatus(), document.getPageCount(), offeringDtos, document.getCreatedAt());
    }

    private static String sanitizeFileName(String input) {
        String name = input.replaceAll("[\\r\\n\\\\/]+", "_").trim();
        return name.length() <= 255 ? name : name.substring(name.length() - 255);
    }

    /** Download result returned only after authorization. */
    public record Download(String fileName, String contentType, long sizeBytes, InputStream content) { }

    /** Authorized immutable values used to call Python without exposing storage metadata. */
    public record TutorScope(UUID documentId, int documentVersion, UUID ownerId, String documentName,
                             int pageCount, UUID courseOfferingId) { }
}
