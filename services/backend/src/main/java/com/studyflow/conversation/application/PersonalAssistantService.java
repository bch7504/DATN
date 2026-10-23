package com.studyflow.conversation.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.conversation.api.PersonalAssistantApiModels;
import com.studyflow.conversation.domain.PersonalConversationData;
import com.studyflow.conversation.domain.PersonalConversationStore;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.integration.ai.AiContracts;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.integration.ai.AiServiceException;
import com.studyflow.review.application.AiQuizService;
import com.studyflow.review.domain.QuizDraftData;
import com.studyflow.review.domain.QuizDraftStore;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Java boundary for the Personal Document Single Orchestrator Agent and persisted owner history. */
@Service
public class PersonalAssistantService {
    private final PersonalConversationStore conversations;
    private final CourseMaterialDocumentRepository documents;
    private final ObjectProvider<AiServiceClient> aiProvider;
    private final AiQuizService quizService;
    private final QuizDraftStore drafts;
    private final Clock clock;

    /**
     * Args: conversation/document stores, optional Python client, Quiz service and clock.
     * Input: Spring-managed dependencies. Output: Personal Assistant application service. Errors: none.
     */
    public PersonalAssistantService(
            PersonalConversationStore conversations,
            CourseMaterialDocumentRepository documents,
            ObjectProvider<AiServiceClient> aiProvider,
            AiQuizService quizService,
            QuizDraftStore drafts,
            Clock clock
    ) {
        this.conversations = conversations;
        this.documents = documents;
        this.aiProvider = aiProvider;
        this.quizService = quizService;
        this.drafts = drafts;
        this.clock = clock;
    }

    /**
     * Args: Student, 1-10 owned READY Personal PDFs and optional title.
     * Input: exact document versions. Output: empty owner conversation. Errors: 404/409/422.
     */
    @Transactional
    public PersonalAssistantApiModels.Conversation create(UUID studentId, List<UUID> documentIds, String title) {
        List<CourseMaterialDocument> scope = scope(studentId, documentIds);
        String normalizedTitle = title == null || title.isBlank() ? "Phiên tài liệu mới" : title.trim();
        if (normalizedTitle.length() > 200) {
            throw new ValidationException("INVALID_TITLE", "Tiêu đề phiên không được quá 200 ký tự.");
        }
        Instant now = clock.instant();
        PersonalConversationData created = conversations.create(new PersonalConversationData(
                UUID.randomUUID(), studentId, normalizedTitle,
                scope.stream().map(document -> new PersonalConversationData.DocumentScope(
                        document.getId(), document.getDocumentVersion())).toList(),
                List.of(), now, now));
        return response(created);
    }

    /** Args: Student owner. Input: active conversations. Output: newest-first conversations with history. Errors: persistence failure. */
    @Transactional(readOnly = true)
    public List<PersonalAssistantApiModels.Conversation> list(UUID studentId) {
        return conversations.findByOwner(studentId).stream().map(this::response).toList();
    }

    /** Args: Student/conversation IDs. Input: owner scope. Output: conversation/history. Errors: 404. */
    @Transactional(readOnly = true)
    public PersonalAssistantApiModels.Conversation get(UUID studentId, UUID conversationId) {
        return response(requireOwned(studentId, conversationId));
    }

    /**
     * Args: Student/conversation, untrusted message and trace ID. Input: current READY snapshot and at most
     * twelve previous turns. Output: persisted structured assistant message. Errors: 404/409/422/502/503.
     */
    @Transactional
    public PersonalAssistantApiModels.Message send(
            UUID studentId,
            UUID conversationId,
            String message,
            String requestId
    ) {
        String normalized = message == null ? "" : message.trim();
        if (normalized.isEmpty() || normalized.length() > 2000) {
            throw new ValidationException("INVALID_MESSAGE", "Nội dung phải có từ 1 đến 2000 ký tự.");
        }
        PersonalConversationData conversation = requireOwned(studentId, conversationId);
        List<CourseMaterialDocument> scope = currentScope(studentId, conversation.documents());
        AiServiceClient ai = aiProvider.getIfAvailable();
        if (ai == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_NOT_CONFIGURED",
                    "Dịch vụ AI chưa được cấu hình.");
        }
        List<AiContracts.ConversationTurn> history = conversation.messages().stream()
                .skip(Math.max(0, conversation.messages().size() - 12L))
                .map(item -> new AiContracts.ConversationTurn(
                        "USER".equals(item.role())
                                ? AiContracts.ConversationRole.USER
                                : AiContracts.ConversationRole.ASSISTANT,
                        item.content()))
                .toList();
        AiContracts.AssistantRunResult result;
        try {
            result = ai.runPersonalAssistant(new AiContracts.PersonalAssistantRunRequest(
                    studentId,
                    conversationId,
                    scope.stream().map(document -> new AiContracts.AuthorizedDocument(
                            document.getId(), document.getDocumentVersion(), document.getOwnerId(),
                            AiContracts.SourceType.PERSONAL_PDF, null)).toList(),
                    history,
                    normalized), requestId).result();
        } catch (AiServiceException exception) {
            HttpStatus status = exception.statusCode() == 503 ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
            throw new ApiException(status, exception.code(), "Không thể hoàn tất yêu cầu AI.");
        }

        validateResult(result, scope);
        Instant now = clock.instant();
        PersonalConversationData.Message user = new PersonalConversationData.Message(
                UUID.randomUUID(), "USER", normalized, null, null, null, List.of(), now);
        String capability = capability(result.selectedTool());
        UUID quizId = null;
        List<PersonalConversationData.Citation> citations = new ArrayList<>();
        String content;
        if (result.status() == AiContracts.AssistantRunStatus.QUIZ_CREATED) {
            QuizDraftData quiz = quizService.saveAssistantQuiz(studentId, normalized, scope, result.quiz());
            quizId = quiz.id();
            Map<String, PersonalConversationData.Citation> unique = new LinkedHashMap<>();
            quiz.questions().stream().flatMap(question -> question.citations().stream()).forEach(citation ->
                    unique.putIfAbsent(citation.documentId() + ":" + citation.pageNumber(),
                            new PersonalConversationData.Citation(citation.documentId(), citation.documentVersion(),
                                    citation.pageNumber(), citation.excerpt())));
            citations.addAll(unique.values());
            content = "Đã tạo bản nháp Quiz gồm " + quiz.questions().size()
                    + " câu. Hãy kiểm tra trước khi chấp nhận.";
        } else if (result.status() == AiContracts.AssistantRunStatus.NEEDS_CLARIFICATION) {
            content = result.clarificationQuestion();
        } else if (result.status() == AiContracts.AssistantRunStatus.NO_EVIDENCE) {
            content = "Không tìm thấy bằng chứng phù hợp trong các tài liệu đã chọn (NO_EVIDENCE).";
        } else {
            content = result.answer();
            citations.addAll(result.citations().stream().map(citation -> new PersonalConversationData.Citation(
                    citation.documentId(), citation.documentVersion(), citation.pageNumber(), citation.excerpt())).toList());
        }
        PersonalConversationData.Message assistant = new PersonalConversationData.Message(
                UUID.randomUUID(), "ASSISTANT", content, result.status().name(), capability, quizId,
                List.copyOf(citations), now.plusNanos(1));
        PersonalConversationData.Message saved = conversations.appendExchange(conversationId, user, assistant, now.plusNanos(1));
        return messageResponse(studentId, saved);
    }

    /** Args: Student/conversation IDs. Input: owner active conversation. Output: void. Errors: 404. */
    @Transactional
    public void delete(UUID studentId, UUID conversationId) {
        if (!conversations.softDelete(studentId, conversationId, clock.instant())) {
            throw new ResourceNotFoundException("CONVERSATION_NOT_FOUND", "Không tìm thấy phiên tài liệu.");
        }
    }

    private List<CourseMaterialDocument> scope(UUID ownerId, List<UUID> ids) {
        if (ids == null || ids.isEmpty() || ids.size() > 10 || ids.stream().anyMatch(java.util.Objects::isNull)
                || new HashSet<>(ids).size() != ids.size()) {
            throw new ValidationException("INVALID_DOCUMENT_SCOPE", "Hãy chọn từ 1 đến 10 tài liệu không trùng nhau.");
        }
        return ids.stream().map(id -> documents
                        .findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(id, ownerId, "PERSONAL")
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "DOCUMENT_NOT_FOUND", "Không tìm thấy tài liệu cá nhân.")))
                .peek(PersonalAssistantService::requireReady)
                .toList();
    }

    private List<CourseMaterialDocument> currentScope(
            UUID ownerId,
            List<PersonalConversationData.DocumentScope> snapshot
    ) {
        List<CourseMaterialDocument> result = new ArrayList<>();
        for (PersonalConversationData.DocumentScope selected : snapshot) {
            CourseMaterialDocument document = documents
                    .findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(
                            selected.documentId(), ownerId, "PERSONAL")
                    .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "DOCUMENT_SCOPE_CHANGED",
                            "Phạm vi tài liệu của phiên đã thay đổi."));
            if (document.getDocumentVersion() != selected.documentVersion()
                    || !"READY".equals(document.getProcessingStatus())) {
                throw new ApiException(HttpStatus.CONFLICT, "DOCUMENT_SCOPE_CHANGED",
                        "Phạm vi tài liệu của phiên đã thay đổi.");
            }
            result.add(document);
        }
        return result;
    }

    private static void requireReady(CourseMaterialDocument document) {
        if (!"READY".equals(document.getProcessingStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "DOCUMENT_NOT_READY", "Tài liệu chưa sẵn sàng cho AI.");
        }
    }

    private static void validateResult(
            AiContracts.AssistantRunResult result,
            List<CourseMaterialDocument> scope
    ) {
        if (result == null || result.status() == null || result.selectedTool() == null) {
            throw invalidAssistantResponse();
        }
        switch (result.status()) {
            case ANSWERED -> {
                if (result.selectedTool() != AiContracts.AssistantTool.ASK_DOCUMENT
                        || result.answer() == null || result.answer().isBlank()
                        || result.citations() == null || result.citations().isEmpty()
                        || result.quiz() != null) {
                    throw invalidAssistantResponse();
                }
            }
            case SUMMARIZED -> {
                if (result.selectedTool() != AiContracts.AssistantTool.SUMMARIZE_DOCUMENT
                        || result.answer() == null || result.answer().isBlank()
                        || result.citations() == null || result.citations().isEmpty()
                        || result.quiz() != null) {
                    throw invalidAssistantResponse();
                }
            }
            case QUIZ_CREATED -> {
                if (result.selectedTool() != AiContracts.AssistantTool.GENERATE_QUIZ || result.quiz() == null) {
                    throw invalidAssistantResponse();
                }
            }
            case NEEDS_CLARIFICATION -> {
                if (result.selectedTool() != AiContracts.AssistantTool.NEEDS_CLARIFICATION
                        || result.clarificationQuestion() == null
                        || result.clarificationQuestion().isBlank()
                        || result.quiz() != null) {
                    throw invalidAssistantResponse();
                }
            }
            case NO_EVIDENCE -> {
                if (result.quiz() != null
                        || result.citations() != null && !result.citations().isEmpty()) {
                    throw invalidAssistantResponse();
                }
            }
        }
        Map<UUID, CourseMaterialDocument> allowed = new HashMap<>();
        scope.forEach(document -> allowed.put(document.getId(), document));
        List<AiContracts.Citation> citations = new ArrayList<>(result.citations() == null ? List.of() : result.citations());
        if (result.quiz() != null && result.quiz().questions() != null) {
            result.quiz().questions().stream()
                    .filter(java.util.Objects::nonNull)
                    .filter(question -> question.citations() != null)
                    .forEach(question -> citations.addAll(question.citations()));
        }
        for (AiContracts.Citation citation : citations) {
            if (citation == null) throw invalidAssistantResponse();
            CourseMaterialDocument document = allowed.get(citation.documentId());
            if (document == null || document.getDocumentVersion() != citation.documentVersion()
                    || citation.pageNumber() < 1 || citation.pageNumber() > document.getPageCount()
                    || citation.excerpt() == null || citation.excerpt().isBlank()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_INVALID_CITATION",
                        "AI trả về nguồn ngoài phạm vi được phép.");
            }
        }
    }

    /** Args: none. Input: malformed structured Python result. Output: safe caller-facing 502 exception. */
    private static ApiException invalidAssistantResponse() {
        return new ApiException(HttpStatus.BAD_GATEWAY, "AI_INVALID_RESPONSE",
                "AI trả về kết quả không hợp lệ.");
    }

    private PersonalConversationData requireOwned(UUID ownerId, UUID conversationId) {
        return conversations.findOwned(ownerId, conversationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "CONVERSATION_NOT_FOUND", "Không tìm thấy phiên tài liệu."));
    }

    private PersonalAssistantApiModels.Conversation response(PersonalConversationData conversation) {
        return new PersonalAssistantApiModels.Conversation(
                conversation.id(), conversation.title(),
                conversation.documents().stream().map(PersonalConversationData.DocumentScope::documentId).toList(),
                conversation.messages().stream().map(message -> messageResponse(conversation.ownerId(), message)).toList(),
                conversation.createdAt(), conversation.updatedAt());
    }

    private PersonalAssistantApiModels.Message messageResponse(UUID ownerId, PersonalConversationData.Message message) {
        List<PersonalAssistantApiModels.Citation> citations = message.citations().stream().map(citation -> {
            CourseMaterialDocument document = documents.findById(citation.documentId()).orElse(null);
            return new PersonalAssistantApiModels.Citation(
                    citation.documentId(),
                    document == null ? "Tài liệu PDF" : document.getDisplayName(),
                    citation.pageNumber(),
                    citation.excerpt(),
                    document == null ? null : document.getSha256());
        }).toList();
        PersonalAssistantApiModels.QuizDraftSummary quiz = null;
        if (message.quizId() != null) {
            QuizDraftData data = drafts.findOwned(ownerId, message.quizId()).orElse(null);
            quiz = new PersonalAssistantApiModels.QuizDraftSummary(
                    message.quizId(), data == null ? 0 : data.questions().size(), null, null, null,
                    data == null ? "GENERATION_FAILED" : data.status());
        }
        return new PersonalAssistantApiModels.Message(
                message.id(), message.role().toLowerCase(java.util.Locale.ROOT), message.content(),
                message.status(), message.capability(), citations, quiz,
                "NEEDS_CLARIFICATION".equals(message.status()) ? List.of("quizDetails") : List.of(),
                message.createdAt());
    }

    private static String capability(AiContracts.AssistantTool tool) {
        if (tool == AiContracts.AssistantTool.GENERATE_QUIZ) return "CREATE_QUIZ";
        return tool.name();
    }
}
