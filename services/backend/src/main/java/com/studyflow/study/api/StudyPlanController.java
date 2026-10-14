package com.studyflow.study.api;

import com.studyflow.common.exception.ApiException;
import com.studyflow.study.application.CreateStudyPlanCommand;
import com.studyflow.study.application.SaveStudyPlanItemCommand;
import com.studyflow.study.application.StudyPlanService;
import com.studyflow.study.application.UpdateStudyPlanCommand;
import com.studyflow.study.application.PageResult;
import com.studyflow.study.domain.StudyPlanStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;

@RestController
@Validated
public class StudyPlanController {

    private final StudyPlanService service;

    /**
     * Creates the HTTP adapter for personal study plans and calendar projection.
     *
     * @param service application service enforcing owner, time and lifecycle rules
     */
    public StudyPlanController(StudyPlanService service) {
        this.service = service;
    }

    /**
     * Creates a plan for the authenticated Student.
     *
     * @param jwt verified JWT with UUID subject
     * @param request validated plan payload
     * @return HTTP 201 plan response
     */
    @PostMapping("/api/v1/study-plans")
    @ResponseStatus(HttpStatus.CREATED)
    public StudyPlanResponse createPlan(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateStudyPlanRequest request
    ) {
        return StudyPlanResponse.from(service.createPlan(
                userId(jwt),
                new CreateStudyPlanCommand(
                        request.title(), request.description(), request.startDate(), request.endDate()
                )
        ));
    }

    /**
     * Lists plans owned by the authenticated Student.
     *
     * @param jwt verified JWT with UUID subject
     * @param status optional case-insensitive lifecycle filter
     * @return HTTP 200 owner-scoped plan array
     */
    @GetMapping("/api/v1/study-plans")
    public PageResponse<StudyPlanResponse> listPlans(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        PageResult<com.studyflow.study.domain.StudyPlan> result = service.listPlans(
                userId(jwt), parsePlanStatus(status), page, size
        );
        return new PageResponse<>(
                result.items().stream().map(StudyPlanResponse::from).toList(),
                result.page(), result.size(), result.totalItems(), result.totalPages()
        );
    }

    /**
     * Gets one owner-scoped plan.
     *
     * @param jwt verified JWT with UUID subject
     * @param planId required UUID path identifier
     * @return HTTP 200 plan response, or owner-safe 404
     */
    @GetMapping("/api/v1/study-plans/{planId}")
    public StudyPlanResponse getPlan(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID planId
    ) {
        return StudyPlanResponse.from(service.getPlan(userId(jwt), planId));
    }

    /**
     * Replaces editable plan fields.
     *
     * @param jwt verified JWT with UUID subject
     * @param planId required owner-scoped plan UUID
     * @param request complete validated replacement payload
     * @return HTTP 200 updated plan response
     */
    @PutMapping("/api/v1/study-plans/{planId}")
    public StudyPlanResponse updatePlan(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID planId,
            @Valid @RequestBody UpdateStudyPlanRequest request
    ) {
        return StudyPlanResponse.from(service.updatePlan(
                userId(jwt),
                planId,
                new UpdateStudyPlanCommand(
                        request.title(), request.description(), request.startDate(),
                        request.endDate(), request.status()
                )
        ));
    }

    /**
     * Archives an owner-scoped plan idempotently.
     *
     * @param jwt verified JWT with UUID subject
     * @param planId required owner-scoped plan UUID
     * @return HTTP 204 with no response body
     */
    @DeleteMapping("/api/v1/study-plans/{planId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archivePlan(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID planId) {
        service.archivePlan(userId(jwt), planId);
    }

    /**
     * Creates an item in an owner-scoped plan.
     *
     * @param jwt verified JWT with UUID subject
     * @param planId required plan UUID
     * @param request validated complete item payload
     * @return HTTP 201 item response
     */
    @PostMapping("/api/v1/study-plans/{planId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public StudyPlanItemResponse createItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID planId,
            @Valid @RequestBody SaveStudyPlanItemRequest request
    ) {
        return StudyPlanItemResponse.from(service.createItem(userId(jwt), planId, itemCommand(request)));
    }

    /**
     * Lists all items in an owner-scoped plan.
     *
     * @param jwt verified JWT with UUID subject
     * @param planId required plan UUID
     * @return HTTP 200 ordered item array
     */
    @GetMapping("/api/v1/study-plans/{planId}/items")
    public PageResponse<StudyPlanItemResponse> listItems(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID planId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size
    ) {
        PageResult<com.studyflow.study.domain.StudyPlanItem> result = service.listItems(
                userId(jwt), planId, page, size
        );
        return new PageResponse<>(
                result.items().stream().map(StudyPlanItemResponse::from).toList(),
                result.page(), result.size(), result.totalItems(), result.totalPages()
        );
    }

    /**
     * Replaces an item without changing its current completion state.
     *
     * @param jwt verified JWT with UUID subject
     * @param planId required plan UUID
     * @param itemId required item UUID
     * @param request validated complete item payload
     * @return HTTP 200 updated item response
     */
    @PutMapping("/api/v1/study-plans/{planId}/items/{itemId}")
    public StudyPlanItemResponse updateItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID planId,
            @PathVariable UUID itemId,
            @Valid @RequestBody SaveStudyPlanItemRequest request
    ) {
        return StudyPlanItemResponse.from(service.updateItem(
                userId(jwt), planId, itemId, itemCommand(request)
        ));
    }

    /**
     * Cancels an item idempotently without deleting history.
     *
     * @param jwt verified JWT with UUID subject
     * @param planId required plan UUID
     * @param itemId required item UUID
     * @return HTTP 204 with no response body
     */
    @DeleteMapping("/api/v1/study-plans/{planId}/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID planId,
            @PathVariable UUID itemId
    ) {
        service.cancelItem(userId(jwt), planId, itemId);
    }

    /**
     * Changes TODO/completed status and records completion idempotently.
     *
     * @param jwt verified JWT with UUID subject
     * @param itemId required owner-scoped item UUID
     * @param idempotencyKey required for a new COMPLETED transition
     * @param request validated target status payload
     * @return HTTP 200 updated item response
     */
    @PatchMapping("/api/v1/study-plan-items/{itemId}/status")
    public StudyPlanItemResponse changeItemStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID itemId,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody UpdateStudyPlanItemStatusRequest request
    ) {
        return StudyPlanItemResponse.from(service.changeItemStatus(
                userId(jwt), itemId, request.status(), idempotencyKey
        ));
    }

    /**
     * Returns the personal calendar projection for a bounded UTC window.
     *
     * @param jwt verified JWT with UUID subject
     * @param from required inclusive UTC instant
     * @param to required exclusive UTC instant
     * @return HTTP 200 ordered calendar item array
     */
    @GetMapping("/api/v1/calendar")
    public CalendarResponse calendar(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam Instant from,
            @RequestParam Instant to
    ) {
        List<StudyPlanItemResponse> items = service.calendar(userId(jwt), from, to).stream()
                .map(StudyPlanItemResponse::from)
                .toList();
        return new CalendarResponse(from, to, items);
    }

    private static SaveStudyPlanItemCommand itemCommand(SaveStudyPlanItemRequest request) {
        return new SaveStudyPlanItemCommand(
                request.title(), request.description(), request.type(), request.scheduledStart(),
                request.scheduledEnd(), request.dueAt(), request.reminderMinutesBefore()
        );
    }

    private static StudyPlanStatus parsePlanStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return null;
        }
        try {
            return StudyPlanStatus.valueOf(rawStatus.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "INVALID_STUDY_PLAN_STATUS",
                    "Trạng thái kế hoạch không hợp lệ"
            );
        }
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw invalidSession();
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw invalidSession();
        }
    }

    private static ApiException invalidSession() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
    }
}
