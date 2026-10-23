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
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;

class CourseMaterialTutorServiceTest {
    private CourseMaterialLibraryService materials;
    private AiServiceClient aiClient;
    private ObjectProvider<AiServiceClient> provider;
    private CourseMaterialTutorService service;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        materials = mock(CourseMaterialLibraryService.class);
        aiClient = mock(AiServiceClient.class);
        provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(aiClient);
        service = new CourseMaterialTutorService(materials, provider);
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
}
