package com.studyflow.document.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

import com.studyflow.common.exception.ValidationException;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.publication.domain.DocumentPublicationRepository;
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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class CourseMaterialLibraryServiceTest {
    private CourseMaterialDocumentRepository documents;
    private AssignmentAttachmentStorage storage;
    private com.studyflow.notification.application.port.NotificationStore notifications;
    private CourseMaterialLibraryService service;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        documents = org.mockito.Mockito.mock(CourseMaterialDocumentRepository.class);
        DocumentPublicationRepository publications = org.mockito.Mockito.mock(DocumentPublicationRepository.class);
        CourseOfferingRepository offerings = org.mockito.Mockito.mock(CourseOfferingRepository.class);
        CourseEnrollmentRepository enrollments = org.mockito.Mockito.mock(CourseEnrollmentRepository.class);
        notifications = org.mockito.Mockito.mock(
                com.studyflow.notification.application.port.NotificationStore.class);
        ObjectProvider<AssignmentAttachmentStorage> storageProvider = org.mockito.Mockito.mock(ObjectProvider.class);
        storage = org.mockito.Mockito.mock(AssignmentAttachmentStorage.class);
        when(storageProvider.getIfAvailable()).thenReturn(storage);
        service = new CourseMaterialLibraryService(documents, publications, offerings, enrollments,
                storageProvider, notifications, Clock.fixed(Instant.parse("2026-10-15T00:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void acceptsAndPersistsTextPdf() throws Exception {
        UUID teacherId = UUID.randomUUID();
        byte[] pdfBytes = pdfWithText("StudyFlow course material");
        MockMultipartFile file = new MockMultipartFile("file", "lesson.pdf", "application/pdf", pdfBytes);
        when(documents.save(any(CourseMaterialDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CourseMaterialDocument saved = service.upload(teacherId, file, "Lesson 1");

        assertEquals("Lesson 1", saved.getDisplayName());
        assertEquals(1, saved.getPageCount());
        verify(storage).put(eq("course-materials/" + teacherId + "/" + saved.getId() + ".pdf"),
                eq("application/pdf"), any(), eq((long) pdfBytes.length));
        verify(notifications).createEventIfAbsent(eq(teacherId),
                eq(com.studyflow.notification.domain.NotificationType.TEACHER_MATERIAL_UPLOADED),
                any(), any(), eq("COURSE_MATERIAL"), eq(saved.getId()), eq(null), any(), eq(false));
        verify(notifications, never()).createEventIfAbsent(any(),
                eq(com.studyflow.notification.domain.NotificationType.STUDENT_MATERIAL_PUBLISHED),
                any(), any(), any(), any(), any(), any(), org.mockito.ArgumentMatchers.anyBoolean());
    }

    @Test
    void rejectsScannedPdfBeforeStorageWrite() throws Exception {
        byte[] scannedPdf = pdfWithText("");
        MockMultipartFile file = new MockMultipartFile("file", "scan.pdf", "application/pdf", scannedPdf);

        ValidationException error = assertThrows(ValidationException.class,
                () -> service.upload(UUID.randomUUID(), file, "Scanned handout"));

        assertEquals("PDF_TEXT_REQUIRED", error.getCode());
        verify(storage, never()).put(any(), any(), any(), any(Long.class));
    }

    @Test
    void rejectsNonPdfBeforeStorageWrite() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "slides.pptx", "application/octet-stream", new byte[] {1, 2, 3});
        assertThrows(com.studyflow.common.exception.ApiException.class,
                () -> service.upload(UUID.randomUUID(), file, "Slides"));
        verify(storage, never()).put(any(), any(), any(), any(Long.class));
    }

    /** No args; synthetic PDF upload followed by late rollback must delete its object; assertion failure signals regression. */
    @Test
    void cleansObjectWhenTransactionRollsBackAfterSaveReturns() throws Exception {
        TransactionSynchronizationManager.initSynchronization();
        try {
            when(documents.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            CourseMaterialDocument saved = service.upload(UUID.randomUUID(),
                    new MockMultipartFile("file", "lesson.pdf", "application/pdf", pdfWithText("Lesson")), "Lesson");
            verify(storage, never()).delete(any());

            TransactionSynchronizationManager.getSynchronizations().forEach(
                    synchronization -> synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

            verify(storage).delete(saved.getStorageKey());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    /** Args: committed/unknown Spring status; synthetic upload keeps its object; output void, assertion on regression. */
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints = {TransactionSynchronization.STATUS_COMMITTED, TransactionSynchronization.STATUS_UNKNOWN})
    void retainsObjectUnlessRollbackIsConfirmed(int completionStatus) throws Exception {
        TransactionSynchronizationManager.initSynchronization();
        try {
            when(documents.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            service.upload(UUID.randomUUID(),
                    new MockMultipartFile("file", "lesson.pdf", "application/pdf", pdfWithText("Lesson")), "Lesson");
            TransactionSynchronizationManager.getSynchronizations().forEach(
                    synchronization -> synchronization.afterCompletion(completionStatus));
            verify(storage, never()).delete(any());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    /** No args; failed DB write and failed cleanup preserve original DB exception. Output void; synthetic storage only. */
    @Test
    void cleanupFailureDoesNotReplaceDatabaseFailure() throws Exception {
        RuntimeException databaseError = new IllegalStateException("Synthetic database failure");
        when(documents.save(any())).thenThrow(databaseError);
        doThrow(new IllegalStateException("Synthetic storage failure")).when(storage).delete(any());
        MockMultipartFile file = new MockMultipartFile("file", "lesson.pdf", "application/pdf", pdfWithText("Lesson"));

        RuntimeException actual = assertThrows(RuntimeException.class,
                () -> service.upload(UUID.randomUUID(), file, "Lesson"));

        assertSame(databaseError, actual);
        verify(storage).delete(any());
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
