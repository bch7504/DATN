package com.studyflow.review.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.integration.ai.AiContracts;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.review.domain.QuizDraftData;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Renders one Java-authorized PDF page rectangle into a private PNG Quiz artifact. */
@Service
public class QuizImageMaterializer {
    private static final float RENDER_DPI = 144F;
    private final ObjectProvider<AssignmentAttachmentStorage> storageProvider;

    /**
     * Args: optional private object-storage provider.
     * Input: Spring storage configuration. Output: reusable materializer. Errors: none until an image is requested.
     */
    public QuizImageMaterializer(ObjectProvider<AssignmentAttachmentStorage> storageProvider) {
        this.storageProvider = Objects.requireNonNull(storageProvider, "storageProvider");
    }

    /**
     * Args: stable question ID, exact source document and validated image reference.
     * Input: READY immutable PDF version already authorized by Java.
     * Output: metadata for one private PNG stored under a server-owned object key.
     * Errors: 503 when storage is unavailable; 502 when the source page cannot be rendered safely.
     */
    public QuizDraftData.Image materialize(
            UUID questionId,
            CourseMaterialDocument document,
            AiContracts.QuizImageReference reference
    ) {
        Objects.requireNonNull(questionId, "questionId");
        Objects.requireNonNull(document, "document");
        Objects.requireNonNull(reference, "reference");
        AssignmentAttachmentStorage storage = storageProvider.getIfAvailable();
        if (storage == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "QUIZ_IMAGE_STORAGE_NOT_CONFIGURED",
                    "Kho lưu trữ ảnh Quiz chưa được cấu hình.");
        }
        UUID imageId = UUID.nameUUIDFromBytes(("quiz-image-v1|" + questionId).getBytes(StandardCharsets.UTF_8));
        String objectKey = "quiz-images/" + questionId + "/" + imageId + ".png";
        try (InputStream source = storage.get(document.getStorageKey());
             PDDocument pdf = Loader.loadPDF(source.readAllBytes());
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (reference.pageNumber() > pdf.getNumberOfPages()) {
                throw invalidArtifact();
            }
            BufferedImage page = new PDFRenderer(pdf)
                    .renderImageWithDPI(reference.pageNumber() - 1, RENDER_DPI, ImageType.RGB);
            AiContracts.NormalizedBoundingBox bbox = reference.bbox();
            int left = clamp((int) Math.floor(bbox.x() * page.getWidth()), 0, page.getWidth() - 1);
            int top = clamp((int) Math.floor(bbox.y() * page.getHeight()), 0, page.getHeight() - 1);
            int right = clamp((int) Math.ceil((bbox.x() + bbox.width()) * page.getWidth()), left + 1,
                    page.getWidth());
            int bottom = clamp((int) Math.ceil((bbox.y() + bbox.height()) * page.getHeight()), top + 1,
                    page.getHeight());
            BufferedImage cropped = page.getSubimage(left, top, right - left, bottom - top);
            if (!ImageIO.write(cropped, "png", output) || output.size() == 0) {
                throw invalidArtifact();
            }
            byte[] png = output.toByteArray();
            storage.put(objectKey, "image/png", new ByteArrayInputStream(png), png.length);
            return new QuizDraftData.Image(
                    imageId, document.getId(), document.getDocumentVersion(), reference.pageNumber(),
                    bbox.x(), bbox.y(), bbox.width(), bbox.height(), objectKey, reference.altText().trim());
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw invalidArtifact();
        }
    }

    /** Args: persisted image metadata. Input: failed surrounding transaction. Output: void; best-effort cleanup. */
    public void deleteQuietly(QuizDraftData.Image image) {
        AssignmentAttachmentStorage storage = storageProvider.getIfAvailable();
        if (storage == null || image == null) return;
        try {
            storage.delete(image.objectKey());
        } catch (RuntimeException ignored) {
            // Storage reconciliation handles a rare orphan; do not hide the original transaction failure.
        }
    }

    private static int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(value, maximum));
    }

    private static ApiException invalidArtifact() {
        return new ApiException(HttpStatus.BAD_GATEWAY, "QUIZ_IMAGE_MATERIALIZATION_FAILED",
                "Không thể tạo ảnh câu hỏi từ đúng trang PDF đã cấp quyền.");
    }
}
