package com.studyflow.conversation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.common.exception.ApiException;
import com.studyflow.conversation.domain.PersonalConversationData;
import com.studyflow.conversation.domain.PersonalConversationStore;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.integration.ai.AiContracts;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.review.application.AiQuizService;
import com.studyflow.review.domain.QuizDraftStore;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

/** Verifies Java rejects malformed Personal Assistant output before persisting conversation history. */
class PersonalAssistantServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-22T00:00:00Z");

    private final PersonalConversationStore conversations = mock(PersonalConversationStore.class);
    private final CourseMaterialDocumentRepository documents = mock(CourseMaterialDocumentRepository.class);
    private final AiServiceClient ai = mock(AiServiceClient.class);
    private final AiQuizService quizService = mock(AiQuizService.class);
    private final QuizDraftStore drafts = mock(QuizDraftStore.class);
    private PersonalAssistantService service;
    private UUID studentId;
    private UUID conversationId;
    private CourseMaterialDocument document;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ObjectProvider<AiServiceClient> aiProvider = mock(ObjectProvider.class);
        when(aiProvider.getIfAvailable()).thenReturn(ai);
        service = new PersonalAssistantService(
                conversations,
                documents,
                aiProvider,
                quizService,
                drafts,
                Clock.fixed(NOW, ZoneOffset.UTC));
        studentId = UUID.randomUUID();
        conversationId = UUID.randomUUID();
        document = CourseMaterialDocument.personal(
                UUID.randomUUID(), studentId, "personal.pdf", "Personal PDF",
                "personal/synthetic.pdf", 128, 5, "b".repeat(64), NOW);
        document.markReady(5, NOW);
        var conversation = new PersonalConversationData(
                conversationId,
                studentId,
                "Synthetic conversation",
                List.of(new PersonalConversationData.DocumentScope(
                        document.getId(), document.getDocumentVersion())),
                List.of(),
                NOW,
                NOW);
        when(conversations.findOwned(studentId, conversationId)).thenReturn(Optional.of(conversation));
        when(documents.findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(
                document.getId(), studentId, "PERSONAL")).thenReturn(Optional.of(document));
        when(documents.findById(document.getId())).thenReturn(Optional.of(document));
        when(conversations.appendExchange(eq(conversationId), any(), any(), any()))
                .thenAnswer(invocation -> invocation.getArgument(2));
    }

    /** A grounded ANSWERED result is persisted with its validated page citation. */
    @Test
    void persistsValidGroundedAnswer() {
        var citation = new AiContracts.Citation(
                document.getId(), document.getDocumentVersion(), 2, "Synthetic evidence");
        var result = new AiContracts.AssistantRunResult(
                AiContracts.AssistantTool.ASK_DOCUMENT,
                AiContracts.AssistantRunStatus.ANSWERED,
                "Grounded answer",
                List.of(citation),
                null,
                null);
        when(ai.runPersonalAssistant(any(), eq("request-1")))
                .thenReturn(new AiContracts.PersonalAssistantRunResponse("request-1", result));

        var response = service.send(studentId, conversationId, "Explain this", "request-1");

        assertThat(response.status()).isEqualTo("ANSWERED");
        assertThat(response.citations()).hasSize(1);
        assertThat(response.citations().get(0).pageNumber()).isEqualTo(2);
    }

    /** ANSWERED without evidence violates the structured contract and must not be saved. */
    @Test
    void rejectsAnswerWithoutCitation() {
        var result = new AiContracts.AssistantRunResult(
                AiContracts.AssistantTool.ASK_DOCUMENT,
                AiContracts.AssistantRunStatus.ANSWERED,
                "Unsupported answer",
                List.of(),
                null,
                null);
        when(ai.runPersonalAssistant(any(), eq("request-2")))
                .thenReturn(new AiContracts.PersonalAssistantRunResponse("request-2", result));

        assertThatThrownBy(() -> service.send(studentId, conversationId, "Explain this", "request-2"))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("AI_INVALID_RESPONSE"));

        verify(conversations, never()).appendExchange(any(), any(), any(), any());
    }
}
