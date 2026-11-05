package com.studyflow.review.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import java.io.InputStream;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owner/enrollment gate for private Quiz image artifacts. */
@Service
public class QuizImageAccessService {
    private final JdbcTemplate jdbc;
    private final ObjectProvider<AssignmentAttachmentStorage> storageProvider;

    /** Args: app-schema JDBC and optional private storage. Input: Spring dependencies. Output: service. */
    public QuizImageAccessService(
            JdbcTemplate jdbc,
            ObjectProvider<AssignmentAttachmentStorage> storageProvider
    ) {
        this.jdbc = Objects.requireNonNull(jdbc, "jdbc");
        this.storageProvider = Objects.requireNonNull(storageProvider, "storageProvider");
    }

    /**
     * Args: authenticated actor ID and opaque image ID.
     * Input: owner draft, or published Teacher Quiz with APPROVED enrollment.
     * Output: private PNG stream and safe alt text. Errors: owner-safe 404 or 503 storage unavailable.
     */
    @Transactional(readOnly = true)
    public Download get(UUID actorId, UUID imageId) {
        Objects.requireNonNull(actorId, "actorId");
        Objects.requireNonNull(imageId, "imageId");
        ImageMetadata metadata;
        try {
            metadata = jdbc.queryForObject("""
                    SELECT image.object_key, image.alt_text
                    FROM app.ai_quiz_question_images image
                    JOIN app.ai_quiz_questions question ON question.id = image.question_id
                    JOIN app.ai_quiz_drafts quiz ON quiz.id = question.quiz_id
                    LEFT JOIN app.course_enrollments enrollment
                      ON enrollment.course_offering_id = quiz.course_offering_id
                     AND enrollment.student_id = ?
                     AND enrollment.status = 'APPROVED'
                    WHERE image.id = ?
                      AND (
                        quiz.owner_id = ?
                        OR (quiz.mode = 'COURSE_TEACHER' AND quiz.status = 'PUBLISHED' AND enrollment.id IS NOT NULL)
                      )
                    """, (row, index) -> new ImageMetadata(
                    row.getString("object_key"), row.getString("alt_text")), actorId, imageId, actorId);
        } catch (EmptyResultDataAccessException exception) {
            throw new ResourceNotFoundException("QUIZ_IMAGE_NOT_FOUND", "Không tìm thấy ảnh câu hỏi.");
        }
        AssignmentAttachmentStorage storage = storageProvider.getIfAvailable();
        if (storage == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "QUIZ_IMAGE_STORAGE_NOT_CONFIGURED",
                    "Kho lưu trữ ảnh Quiz chưa được cấu hình.");
        }
        return new Download(storage.get(metadata.objectKey()), metadata.altText());
    }

    private record ImageMetadata(String objectKey, String altText) { }

    /** Output contract for one authorized PNG download. Caller must close the stream after transfer. */
    public record Download(InputStream stream, String altText) { }
}
