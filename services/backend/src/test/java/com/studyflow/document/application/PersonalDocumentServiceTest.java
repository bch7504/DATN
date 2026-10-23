package com.studyflow.document.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.common.exception.ApiException;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import java.io.ByteArrayOutputStream;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.MockMultipartFile;

/** Personal Document boundary tests use generated PDFs and fake adapters only. */
class PersonalDocumentServiceTest {
    private final CourseMaterialDocumentRepository documents = mock(CourseMaterialDocumentRepository.class);
    private final AssignmentAttachmentStorage storage = mock(AssignmentAttachmentStorage.class);
    private PersonalDocumentService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ObjectProvider<AssignmentAttachmentStorage> storageProvider = mock(ObjectProvider.class);
        ObjectProvider<AiServiceClient> aiProvider = mock(ObjectProvider.class);
        when(storageProvider.getIfAvailable()).thenReturn(storage);
        service = new PersonalDocumentService(
                documents,
                storageProvider,
                aiProvider,
                Clock.fixed(Instant.parse("2026-10-22T00:00:00Z"), ZoneOffset.UTC));
    }

    /** A valid text PDF is stored privately and starts in PENDING_PROCESSING with a SHA-256 identity. */
    @Test
    void uploadsValidTextPdfAsPending() throws Exception {
        UUID studentId = UUID.randomUUID();
        when(documents.existsByOwnerIdAndDocumentScopeAndSha256AndDeletedAtIsNull(
                any(UUID.class), anyString(), anyString())).thenReturn(false);
        when(documents.save(any(CourseMaterialDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.upload(studentId, new MockMultipartFile(
                "file", "notes.pdf", "application/pdf", pdfWithText("Synthetic study notes")));

        assertThat(response.status()).isEqualTo("PENDING_PROCESSING");
        assertThat(response.sha256()).hasSize(64);
        assertThat(response.pageCount()).isEqualTo(1);
        verify(storage).put(anyString(), anyString(), any(), anyLong());
    }

    /** An existing owner-scoped hash is rejected before any storage side effect. */
    @Test
    void rejectsDuplicateOwnedPdfBeforeStorage() throws Exception {
        when(documents.existsByOwnerIdAndDocumentScopeAndSha256AndDeletedAtIsNull(
                any(UUID.class), anyString(), anyString())).thenReturn(true);

        assertThatThrownBy(() -> service.upload(UUID.randomUUID(), new MockMultipartFile(
                "file", "duplicate.pdf", "application/pdf", pdfWithText("Duplicate content"))))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("DUPLICATE_DOCUMENT"));

        verify(storage, never()).put(anyString(), anyString(), any(), anyLong());
    }

    /** A PDF without extractable text is rejected before hashing, persistence or storage. */
    @Test
    void rejectsPdfWithoutTextLayer() throws Exception {
        assertThatThrownBy(() -> service.upload(UUID.randomUUID(), new MockMultipartFile(
                "file", "scan.pdf", "application/pdf", pdfWithText(""))))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("PDF_TEXT_REQUIRED"));

        verify(documents, never()).save(any(CourseMaterialDocument.class));
        verify(storage, never()).put(anyString(), anyString(), any(), anyLong());
    }

    private static byte[] pdfWithText(String text) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            if (!text.isBlank()) {
                try (PDPageContentStream stream = new PDPageContentStream(document, document.getPage(0))) {
                    stream.beginText();
                    stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                    stream.newLineAtOffset(40, 700);
                    stream.showText(text);
                    stream.endText();
                }
            }
            document.save(output);
            return output.toByteArray();
        }
    }
}
