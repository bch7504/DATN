package com.studyflow.document.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.common.exception.ApiException;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.document.domain.CourseMaterialType;
import com.studyflow.document.domain.TeacherResourceLibraryItemRepository;
import com.studyflow.integration.ai.AiContracts.JobAcceptedResponse;
import com.studyflow.integration.ai.AiContracts.JobStatus;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.publication.domain.DocumentPublication;
import com.studyflow.publication.domain.DocumentPublicationRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

/** Safe Course Material deletion tests use mock adapters and no real document bytes. */
class TeacherCourseMaterialDeletionServiceTest {
    private static final UUID TEACHER_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID DOCUMENT_ID = UUID.fromString("00000000-0000-0000-0000-000000000202");
    private static final Instant NOW = Instant.parse("2026-11-06T02:00:00Z");
    private final CourseMaterialDocumentRepository documents = mock(CourseMaterialDocumentRepository.class);
    private final DocumentPublicationRepository publications = mock(DocumentPublicationRepository.class);
    private final TeacherResourceLibraryItemRepository libraryItems = mock(TeacherResourceLibraryItemRepository.class);
    private final AssignmentAttachmentStorage storage = mock(AssignmentAttachmentStorage.class);
    private final AiServiceClient ai = mock(AiServiceClient.class);
    private TeacherCourseMaterialDeletionService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ObjectProvider<AssignmentAttachmentStorage> storageProvider = mock(ObjectProvider.class);
        ObjectProvider<AiServiceClient> aiProvider = mock(ObjectProvider.class);
        when(storageProvider.getIfAvailable()).thenReturn(storage);
        when(aiProvider.getIfAvailable()).thenReturn(ai);
        service = new TeacherCourseMaterialDeletionService(
                documents, publications, libraryItems, storageProvider, aiProvider,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void deindexesRevokesReferencesAndSoftDeletesOwnedSlide() {
        CourseMaterialDocument document = new CourseMaterialDocument(
                DOCUMENT_ID, TEACHER_ID, "chapter-2.pdf", "Chương 2",
                "course-materials/teacher/chapter-2.pdf", 1024, 10,
                CourseMaterialType.SLIDE_PDF, NOW.minusSeconds(60));
        document.markReady(10, NOW.minusSeconds(30));
        DocumentPublication publication = new DocumentPublication(
                UUID.randomUUID(), DOCUMENT_ID, UUID.randomUUID(), TEACHER_ID, NOW.minusSeconds(20));
        when(documents.findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(
                DOCUMENT_ID, TEACHER_ID, "COURSE_MATERIAL")).thenReturn(Optional.of(document));
        when(publications.findByDocumentIdAndStatus(DOCUMENT_ID, "PUBLISHED"))
                .thenReturn(List.of(publication));
        when(ai.deindexDocument(any(), anyString(), anyString())).thenReturn(
                new JobAcceptedResponse("request-delete", UUID.randomUUID(), JobStatus.PENDING));

        service.delete(TEACHER_ID, DOCUMENT_ID, "request-delete");

        assertThat(document.getDeletedAt()).isEqualTo(NOW);
        assertThat(document.getProcessingStatus()).isEqualTo("DELETING");
        assertThat(publication.getStatus()).isEqualTo("REVOKED");
        verify(ai).deindexDocument(any(), anyString(), anyString());
        verify(libraryItems).deleteByItemTypeAndItemId("DOCUMENT", DOCUMENT_ID);
        verify(storage).delete("course-materials/teacher/chapter-2.pdf");
    }

    @Test
    void hidesMissingOrForeignDocumentWithoutSideEffects() {
        when(documents.findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(
                DOCUMENT_ID, TEACHER_ID, "COURSE_MATERIAL")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(TEACHER_ID, DOCUMENT_ID, "request-delete"))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("DOCUMENT_NOT_FOUND"));

        verify(ai, never()).deindexDocument(any(), anyString(), anyString());
        verify(storage, never()).delete(anyString());
    }
}
