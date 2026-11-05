package com.studyflow.review.application;

import static org.assertj.core.api.Assertions.assertThat;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.integration.ai.AiContracts;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

/** Synthetic PDF test for Java-owned private Quiz image materialization. */
class QuizImageMaterializerTest {

    /** A trusted full-page reference produces a PNG without exposing its object key publicly. */
    @Test
    void rendersAuthorizedPdfPageToPrivatePng() throws Exception {
        byte[] pdf = syntheticPdf();
        FakeStorage storage = new FakeStorage(pdf);
        StaticListableBeanFactory factory = new StaticListableBeanFactory();
        factory.addBean("storage", storage);
        CourseMaterialDocument document = CourseMaterialDocument.personal(
                UUID.randomUUID(), UUID.randomUUID(), "source.pdf", "Source",
                "personal/source.pdf", pdf.length, 1, "a".repeat(64), Instant.EPOCH);
        document.markReady(1, Instant.EPOCH);
        UUID questionId = UUID.randomUUID();
        var reference = new AiContracts.QuizImageReference(
                document.getId(), 1, 1,
                new AiContracts.NormalizedBoundingBox(0, 0, 1, 1), "Trang PDF tổng hợp");

        var result = new QuizImageMaterializer(factory.getBeanProvider(AssignmentAttachmentStorage.class))
                .materialize(questionId, document, reference);

        assertThat(storage.contentType).isEqualTo("image/png");
        assertThat(storage.stored).startsWith(0x89, 0x50, 0x4E, 0x47);
        assertThat(result.documentId()).isEqualTo(document.getId());
        assertThat(result.pageNumber()).isEqualTo(1);
        assertThat(result.altText()).isEqualTo("Trang PDF tổng hợp");
    }

    private static byte[] syntheticPdf() throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.save(output);
            return output.toByteArray();
        }
    }

    private static final class FakeStorage implements AssignmentAttachmentStorage {
        private final byte[] source;
        private byte[] stored;
        private String contentType;

        private FakeStorage(byte[] source) {
            this.source = source;
        }

        @Override
        public void put(String objectKey, String contentType, InputStream input, long contentLength) throws IOException {
            this.contentType = contentType;
            this.stored = input.readAllBytes();
            assertThat(stored).hasSize((int) contentLength);
        }

        @Override
        public InputStream get(String objectKey) {
            return new ByteArrayInputStream(source);
        }

        @Override
        public void delete(String objectKey) { }
    }
}
