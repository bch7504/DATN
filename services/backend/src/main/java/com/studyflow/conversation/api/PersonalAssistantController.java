package com.studyflow.conversation.api;

import com.studyflow.common.api.RequestIdFilter;
import com.studyflow.common.exception.ApiException;
import com.studyflow.conversation.application.PersonalAssistantService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public Student API for the Personal Assistant embedded in the Personal PDF workspace. */
@RestController
@RequestMapping("/api/v1/student/chat/conversations")
@PreAuthorize("hasRole('STUDENT')")
public class PersonalAssistantController {
    private final PersonalAssistantService service;

    /** Args: assistant service. Input: Spring dependency. Output: controller. Errors: none. */
    public PersonalAssistantController(PersonalAssistantService service) { this.service = service; }

    /** Input: Student and 1-10 READY Personal PDF IDs. Output: HTTP 201 conversation. Errors: 404/409/422. */
    @PostMapping
    public ResponseEntity<PersonalAssistantApiModels.Conversation> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PersonalAssistantApiModels.CreateConversationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(userId(jwt), request.selectedDocumentIds(), request.title()));
    }

    /** Input: Student owner. Output: page-zero conversation history. Errors: 401/403. */
    @GetMapping
    public PersonalAssistantApiModels.ConversationList list(@AuthenticationPrincipal Jwt jwt) {
        List<PersonalAssistantApiModels.Conversation> items = service.list(userId(jwt));
        return new PersonalAssistantApiModels.ConversationList(
                items, 0, items.size(), items.size(), items.isEmpty() ? 0 : 1);
    }

    /** Input: Student/conversation IDs. Output: conversation history. Errors: 404. */
    @GetMapping("/{conversationId}")
    public PersonalAssistantApiModels.Conversation get(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID conversationId
    ) {
        return service.get(userId(jwt), conversationId);
    }

    /** Input: owner conversation and free-form message. Output: persisted assistant result. Errors: 404/409/422/502/503. */
    @PostMapping("/{conversationId}/messages")
    public PersonalAssistantApiModels.Message send(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID conversationId,
            @Valid @RequestBody PersonalAssistantApiModels.SendMessageRequest request,
            @RequestAttribute(name = RequestIdFilter.ATTRIBUTE) String requestId
    ) {
        return service.send(userId(jwt), conversationId, request.message(), requestId);
    }

    /** Input: Student owner/conversation IDs. Output: HTTP 204. Errors: 404. */
    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID conversationId
    ) {
        service.delete(userId(jwt), conversationId);
        return ResponseEntity.noContent().build();
    }

    /** Args: authenticated JWT. Input: UUID subject. Output: actor UUID. Errors: 401 for missing/malformed subject. */
    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        }
    }
}
