package com.studyflow.document.application;

import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.assignment.domain.CourseAssignment;
import com.studyflow.assignment.domain.CourseAssignmentRepository;
import com.studyflow.common.exception.ApiException;
import com.studyflow.document.api.TeacherResourceLibraryApi;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.document.domain.TeacherResourceLibrary;
import com.studyflow.document.domain.TeacherResourceLibraryItem;
import com.studyflow.document.domain.TeacherResourceLibraryItemRepository;
import com.studyflow.document.domain.TeacherResourceLibraryRepository;
import com.studyflow.review.domain.QuizDraftData;
import com.studyflow.review.domain.QuizDraftStore;
import java.time.Clock;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Java-owned rules for Teacher subject/private libraries and typed resource references. */
@Service
public class TeacherResourceLibraryService {
    private final TeacherResourceLibraryRepository libraries;
    private final TeacherResourceLibraryItemRepository items;
    private final SubjectRepository subjects;
    private final CourseMaterialDocumentRepository documents;
    private final QuizDraftStore quizzes;
    private final CourseAssignmentRepository assignments;
    private final Clock clock;

    /** Args: repositories and clock. Input: Spring dependencies. Output: service. Errors: none. */
    public TeacherResourceLibraryService(
            TeacherResourceLibraryRepository libraries,
            TeacherResourceLibraryItemRepository items,
            SubjectRepository subjects,
            CourseMaterialDocumentRepository documents,
            QuizDraftStore quizzes,
            CourseAssignmentRepository assignments,
            Clock clock
    ) {
        this.libraries = libraries;
        this.items = items;
        this.subjects = subjects;
        this.documents = documents;
        this.quizzes = quizzes;
        this.assignments = assignments;
        this.clock = clock;
    }

    /**
     * Args: Teacher ID. Input: authenticated owner scope.
     * Output: active libraries with the non-deletable DEFAULT library first; creates it lazily when absent.
     * Errors: persistence conflict/failure is propagated.
     */
    @Transactional
    public List<TeacherResourceLibraryApi.Library> list(UUID teacherId) {
        ensureDefaultLibrary(teacherId);
        return libraries.findByTeacherIdAndDeletedAtIsNullOrderByCreatedAtDesc(teacherId).stream()
                .sorted(Comparator.comparing((TeacherResourceLibrary library) -> !library.isDefaultLibrary())
                        .thenComparing(TeacherResourceLibrary::getCreatedAt, Comparator.reverseOrder()))
                .map(library -> response(teacherId, library)).toList();
    }

    /**
     * Args: Teacher ID, normalized name and optional subject ID.
     * Input: authenticated Teacher; subject must exist and be ACTIVE when supplied.
     * Output: created empty SUBJECT or PRIVATE library. Errors: 404 subject, 409 inactive, 422 invalid name.
     */
    @Transactional
    public TeacherResourceLibraryApi.Library create(UUID teacherId, String name, UUID subjectId) {
        if (name == null || name.isBlank() || name.strip().length() > 120) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_LIBRARY_NAME", "Tên kho phải có từ 1 đến 120 ký tự.");
        }
        if (subjectId != null) {
            Subject subject = subjects.findById(subjectId).orElseThrow(() -> new ApiException(
                    HttpStatus.NOT_FOUND, "SUBJECT_NOT_FOUND", "Không tìm thấy môn học."));
            if (!"ACTIVE".equals(subject.getStatus())) {
                throw new ApiException(HttpStatus.CONFLICT, "SUBJECT_INACTIVE", "Môn học không còn hoạt động.");
            }
        }
        TeacherResourceLibrary saved = libraries.save(new TeacherResourceLibrary(
                UUID.randomUUID(), teacherId, name, subjectId, clock.instant()));
        return response(teacherId, saved);
    }

    /**
     * Args: Teacher/library IDs. Input: owned active collection.
     * Output: void; soft-deletes the collection but preserves source PDF/Quiz/Assignment records.
     * Errors: 404 for missing or foreign collection.
     */
    @Transactional
    public void delete(UUID teacherId, UUID libraryId) {
        TeacherResourceLibrary library = requireOwned(teacherId, libraryId);
        if (library.isDefaultLibrary()) {
            throw new ApiException(HttpStatus.CONFLICT, "DEFAULT_LIBRARY_REQUIRED",
                    "Kho Tài liệu tải lên là kho mặc định và không thể xóa.");
        }
        library.softDelete(clock.instant());
    }

    /**
     * Args: authenticated Teacher ID, optional preferred library ID and freshly persisted document ID.
     * Input: CourseMaterialLibraryService calls this inside the upload transaction; a supplied library must belong
     * to the Teacher. Output: void; links the document to that library, or to DEFAULT when no library was selected.
     * Errors: 404 for a foreign/missing preferred library; persistence failures roll back the upload transaction.
     */
    @Transactional
    public void fileUploaded(UUID teacherId, UUID preferredLibraryId, UUID documentId) {
        TeacherResourceLibrary target = preferredLibraryId == null
                ? ensureDefaultLibrary(teacherId)
                : requireOwned(teacherId, preferredLibraryId);
        items.insertIgnore(UUID.randomUUID(), target.getId(), "DOCUMENT", documentId, clock.instant());
    }

    /**
     * Args: Teacher/library IDs, item type and resource ID.
     * Input: active owned collection and an owned DOCUMENT, QUIZ or ASSIGNMENT.
     * Output: refreshed library; duplicate additions are idempotent. Errors: 404 foreign/missing resource, 422 type.
     */
    @Transactional
    public TeacherResourceLibraryApi.Library addItem(UUID teacherId, UUID libraryId, String itemType, UUID itemId) {
        TeacherResourceLibrary library = requireOwned(teacherId, libraryId);
        String type = normalizedType(itemType);
        requireOwnedItem(teacherId, type, itemId);
        items.insertIgnore(UUID.randomUUID(), libraryId, type, itemId, clock.instant());
        return response(teacherId, library);
    }

    /** Args: Teacher/library/item IDs. Input: owned active collection. Output: void; removes only the reference. Errors: 404. */
    @Transactional
    public void removeItem(UUID teacherId, UUID libraryId, UUID itemReferenceId) {
        requireOwned(teacherId, libraryId);
        TeacherResourceLibraryItem item = items.findById(itemReferenceId).orElseThrow(() -> notFound("Không tìm thấy mục trong kho."));
        if (!item.getLibraryId().equals(libraryId)) throw notFound("Không tìm thấy mục trong kho.");
        items.delete(item);
    }

    private TeacherResourceLibrary requireOwned(UUID teacherId, UUID libraryId) {
        return libraries.findByIdAndTeacherIdAndDeletedAtIsNull(libraryId, teacherId)
                .orElseThrow(() -> notFound("Không tìm thấy kho tài liệu."));
    }

    private TeacherResourceLibrary ensureDefaultLibrary(UUID teacherId) {
        return libraries.findByTeacherIdAndLibraryTypeAndDeletedAtIsNull(teacherId, "DEFAULT")
                .orElseGet(() -> libraries.save(TeacherResourceLibrary.defaultLibrary(
                        UUID.nameUUIDFromBytes(("studyflow-default-library:" + teacherId)
                                .getBytes(StandardCharsets.UTF_8)),
                        teacherId,
                        clock.instant())));
    }

    private void requireOwnedItem(UUID teacherId, String type, UUID itemId) {
        if (itemId == null) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ITEM_ID_REQUIRED", "Thiếu mã tài nguyên.");
        switch (type) {
            case "DOCUMENT" -> documents.findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(itemId, teacherId, "COURSE_MATERIAL")
                    .orElseThrow(() -> notFound("Không tìm thấy tài liệu thuộc giảng viên."));
            case "QUIZ" -> {
                QuizDraftData quiz = quizzes.findOwned(teacherId, itemId).orElseThrow(() -> notFound("Không tìm thấy Quiz thuộc giảng viên."));
                if (!"COURSE_TEACHER".equals(quiz.mode())) throw notFound("Không tìm thấy Quiz thuộc giảng viên.");
            }
            case "ASSIGNMENT" -> {
                CourseAssignment assignment = assignments.findById(itemId).orElseThrow(() -> notFound("Không tìm thấy bài tập thuộc giảng viên."));
                if (!assignment.getTeacherId().equals(teacherId)) throw notFound("Không tìm thấy bài tập thuộc giảng viên.");
            }
            default -> throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_ITEM_TYPE", "Loại tài nguyên không hợp lệ.");
        }
    }

    private TeacherResourceLibraryApi.Library response(UUID teacherId, TeacherResourceLibrary library) {
        Subject subject = library.getSubjectId() == null ? null : subjects.findById(library.getSubjectId()).orElse(null);
        List<TeacherResourceLibraryApi.Item> itemResponses = items.findByLibraryIdOrderByAddedAtDesc(library.getId()).stream()
                .map(item -> itemResponse(teacherId, item)).filter(java.util.Objects::nonNull).toList();
        return new TeacherResourceLibraryApi.Library(library.getId(), library.getName(), library.getLibraryType(),
                library.getSubjectId(), subject == null ? null : subject.getCode(), subject == null ? null : subject.getName(),
                itemResponses, library.getCreatedAt());
    }

    private TeacherResourceLibraryApi.Item itemResponse(UUID teacherId, TeacherResourceLibraryItem item) {
        return switch (item.getItemType()) {
            case "DOCUMENT" -> documents.findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(item.getItemId(), teacherId, "COURSE_MATERIAL")
                    .map(value -> apiItem(item, value.getDisplayName(), value.getProcessingStatus())).orElse(null);
            case "QUIZ" -> quizzes.findOwned(teacherId, item.getItemId())
                    .map(value -> apiItem(item, value.title(), value.status())).orElse(null);
            case "ASSIGNMENT" -> assignments.findById(item.getItemId())
                    .filter(value -> value.getTeacherId().equals(teacherId))
                    .map(value -> apiItem(item, value.getTitle(), value.getStatus().name())).orElse(null);
            default -> null;
        };
    }

    private static TeacherResourceLibraryApi.Item apiItem(TeacherResourceLibraryItem item, String title, String status) {
        return new TeacherResourceLibraryApi.Item(item.getId(), item.getItemType(), item.getItemId(), title, status, item.getAddedAt());
    }

    private static String normalizedType(String itemType) {
        String value = itemType == null ? "" : itemType.strip().toUpperCase(Locale.ROOT);
        if (!java.util.Set.of("DOCUMENT", "QUIZ", "ASSIGNMENT").contains(value)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_ITEM_TYPE", "Loại tài nguyên không hợp lệ.");
        }
        return value;
    }

    private static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", message);
    }
}
