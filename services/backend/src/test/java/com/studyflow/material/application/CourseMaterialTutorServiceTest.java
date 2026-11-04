package com.studyflow.material.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.common.exception.ApiException;
import com.studyflow.document.application.CourseMaterialLibraryService;
import com.studyflow.integration.ai.AiContracts;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.material.domain.CourseMaterialTutorConversation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import com.studyflow.material.domain.CourseMaterialTutorConversationStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;

class CourseMaterialTutorServiceTest {
    private CourseMaterialLibraryService materials;
    private AiServiceClient aiClient;
    private ObjectProvider<AiServiceClient> provider;
    private CourseMaterialTutorConversationStore conversations;
    private CourseMaterialTutorService service;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        materials = mock(CourseMaterialLibraryService.class);
        aiClient = mock(AiServiceClient.class);
        provider = mock(ObjectProvider.class);
        conversations = mock(CourseMaterialTutorConversationStore.class);
        when(provider.getIfAvailable()).thenReturn(aiClient);
        when(conversations.findByScope(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(Optional.empty());
        when(conversations.findOrCreate(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        service = new CourseMaterialTutorService(
                materials,
                provider,
                conversations,
                Clock.fixed(Instant.parse("2026-11-02T00:00:00Z"), ZoneOffset.UTC));
    }

    /** Valid authorized scope is forwarded to Python and the grounded result is mapped for the browser. */
    @Test
    void forwardsOnlyJavaAuthorizedScopeAndMapsAnswer() {
        UUID studentId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID offeringId = UUID.randomUUID();
        var scope = new CourseMaterialLibraryService.TutorScope(
                documentId, 1, ownerId, "Cơ sở dữ liệu.pdf", 20, offeringId);
        when(materials.authorizeTutor(studentId, documentId, 7)).thenReturn(scope);
        when(aiClient.askCourseMaterial(org.mockito.ArgumentMatchers.any(), eq("req-tutor-001")))
                .thenReturn(new AiContracts.CourseMaterialAskResponse(
                        "req-tutor-001",
                        new AiContracts.GroundedAnswerResult(
                                AiContracts.AnswerStatus.ANSWERED,
                                "Transaction bảo đảm tính nhất quán.",
                                List.of(new AiContracts.Citation(documentId, 1, 7, "ACID gồm bốn thuộc tính.")))));

        var result = service.ask(studentId, documentId, 7, "  Giải thích ACID  ", "req-tutor-001");

        assertEquals("ANSWERED", result.status());
        assertEquals(1, result.citations().size());
        assertEquals("Cơ sở dữ liệu.pdf", result.citations().get(0).documentName());
        ArgumentCaptor<AiContracts.CourseMaterialAskRequest> request =
                ArgumentCaptor.forClass(AiContracts.CourseMaterialAskRequest.class);
        verify(aiClient).askCourseMaterial(request.capture(), eq("req-tutor-001"));
        assertEquals(studentId, request.getValue().userId());
        assertEquals(offeringId, request.getValue().courseOfferingId());
        assertEquals(documentId, request.getValue().document().documentId());
        assertEquals(AiContracts.SourceType.COURSE_MATERIAL_PDF, request.getValue().document().sourceType());
        assertEquals(List.of(), request.getValue().history());
        assertEquals("Giải thích ACID", request.getValue().question());
    }

    /** A Python citation outside the Java-authorized version must never reach the browser. */
    @Test
    void rejectsCitationOutsideAuthorizedDocumentVersion() {
        UUID studentId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        var scope = new CourseMaterialLibraryService.TutorScope(
                documentId, 2, UUID.randomUUID(), "Lesson.pdf", 5, UUID.randomUUID());
        when(materials.authorizeTutor(studentId, documentId, 2)).thenReturn(scope);
        when(aiClient.askCourseMaterial(org.mockito.ArgumentMatchers.any(), eq("req-tutor-002")))
                .thenReturn(new AiContracts.CourseMaterialAskResponse(
                        "req-tutor-002",
                        new AiContracts.GroundedAnswerResult(
                                AiContracts.AnswerStatus.ANSWERED,
                                "Synthetic answer",
                                List.of(new AiContracts.Citation(documentId, 1, 2, "Wrong version")))));

        ApiException error = assertThrows(ApiException.class,
                () -> service.ask(studentId, documentId, 2, "Question", "req-tutor-002"));

        assertEquals("AI_INVALID_CITATION", error.code());
        assertEquals(502, error.status().value());
    }

    /** AI-disabled deployments fail explicitly instead of returning a fixture answer. */
    @Test
    void reportsUnavailableWhenPythonClientIsDisabled() {
        UUID studentId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        when(materials.authorizeTutor(studentId, documentId, 1)).thenReturn(
                new CourseMaterialLibraryService.TutorScope(
                        documentId, 1, UUID.randomUUID(), "Lesson.pdf", 3, UUID.randomUUID()));
        when(provider.getIfAvailable()).thenReturn(null);

        ApiException error = assertThrows(ApiException.class,
                () -> service.ask(studentId, documentId, 1, "Question", "req-tutor-003"));

        assertEquals("AI_SERVICE_UNAVAILABLE", error.code());
        assertEquals(503, error.status().value());
    }

    /** Java restores persisted memory but sends only the twelve newest turns to Python. */
    @Test
    void forwardsOnlyBoundedShortTermMemoryFromLongTermConversation() {
        UUID studentId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        UUID offeringId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();
        var scope = new CourseMaterialLibraryService.TutorScope(
                documentId, 3, UUID.randomUUID(), "Kỹ thuật số.pdf", 30, offeringId);
        when(materials.authorizeTutor(studentId, documentId, 9)).thenReturn(scope);
        List<CourseMaterialTutorConversation.Message> messages = java.util.stream.IntStream.range(0, 14)
                .mapToObj(index -> new CourseMaterialTutorConversation.Message(
                        UUID.randomUUID(), index % 2 == 0 ? "USER" : "ASSISTANT", 8,
                        "Turn " + index, index % 2 == 0 ? null : "ANSWERED", List.of(),
                        Instant.parse("2026-11-01T00:00:00Z").plusSeconds(index)))
                .toList();
        var conversation = new CourseMaterialTutorConversation(
                conversationId, studentId, documentId, 3, offeringId, messages,
                Instant.parse("2026-11-01T00:00:00Z"), Instant.parse("2026-11-01T00:00:13Z"));
        when(conversations.findByScope(studentId, documentId, 3, offeringId))
                .thenReturn(Optional.of(conversation));
        when(aiClient.askCourseMaterial(org.mockito.ArgumentMatchers.any(), eq("req-memory-001")))
                .thenReturn(new AiContracts.CourseMaterialAskResponse(
                        "req-memory-001",
                        new AiContracts.GroundedAnswerResult(
                                AiContracts.AnswerStatus.NO_EVIDENCE, null, List.of())));

        var result = service.ask(studentId, documentId, 9, "Nó có ý nghĩa gì?", "req-memory-001");

        ArgumentCaptor<AiContracts.CourseMaterialAskRequest> request =
                ArgumentCaptor.forClass(AiContracts.CourseMaterialAskRequest.class);
        verify(aiClient).askCourseMaterial(request.capture(), eq("req-memory-001"));
        assertEquals(12, request.getValue().history().size());
        assertEquals("Turn 2", request.getValue().history().get(0).content());
        assertEquals(conversationId, result.conversationId());
        assertEquals("NO_EVIDENCE", result.status());
    }

    /** Long-term memory is restored only after Java reauthorizes the current document version. */
    @Test
    void restoresAuthorizedLongTermHistoryWithValidatedDocumentMetadata() {
        UUID studentId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        UUID offeringId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();
        var scope = new CourseMaterialLibraryService.TutorScope(
                documentId, 2, UUID.randomUUID(), "Kỹ thuật số.pdf", 24, offeringId);
        when(materials.authorizeTutor(studentId, documentId, 1)).thenReturn(scope);
        var citation = new CourseMaterialTutorConversation.Citation(
                documentId, 2, 6, "Mạch tổ hợp không có phần tử nhớ.");
        var conversation = new CourseMaterialTutorConversation(
                conversationId, studentId, documentId, 2, offeringId,
                List.of(
                        new CourseMaterialTutorConversation.Message(
                                UUID.randomUUID(), "USER", 6, "Mạch tổ hợp là gì?", null,
                                List.of(), Instant.parse("2026-11-01T00:00:00Z")),
                        new CourseMaterialTutorConversation.Message(
                                UUID.randomUUID(), "ASSISTANT", 6, "Mạch tổ hợp không có phần tử nhớ.",
                                "ANSWERED", List.of(citation), Instant.parse("2026-11-01T00:00:01Z"))),
                Instant.parse("2026-11-01T00:00:00Z"), Instant.parse("2026-11-01T00:00:01Z"));
        when(conversations.findByScope(studentId, documentId, 2, offeringId))
                .thenReturn(Optional.of(conversation));

        var result = service.history(studentId, documentId);

        assertEquals(conversationId, result.conversationId());
        assertEquals(2, result.documentVersion());
        assertEquals(2, result.messages().size());
        assertEquals("Kỹ thuật số.pdf", result.messages().get(1).citations().get(0).documentName());
        verify(materials).authorizeTutor(studentId, documentId, 1);
    }
}
