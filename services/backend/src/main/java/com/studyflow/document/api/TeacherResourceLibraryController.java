package com.studyflow.document.api;

import com.studyflow.common.exception.ApiException;
import com.studyflow.document.application.TeacherResourceLibraryService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public Java API for Teacher-owned subject/private resource collections. */
@RestController
@RequestMapping("/api/v1/teacher/resource-libraries")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherResourceLibraryController {
    private final TeacherResourceLibraryService service;

    /** Args: library service. Input: Spring dependency. Output: controller. Errors: none. */
    public TeacherResourceLibraryController(TeacherResourceLibraryService service) { this.service = service; }

    /** Input: authenticated Teacher. Output: 200 active libraries with typed items. Errors: 401/403. */
    @GetMapping
    public List<TeacherResourceLibraryApi.Library> list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(userId(jwt));
    }

    /** Input: authenticated Teacher, name and optional active subject. Output: 201 empty library. Errors: 404/409/422. */
    @PostMapping
    public ResponseEntity<TeacherResourceLibraryApi.Library> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody TeacherResourceLibraryApi.CreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(userId(jwt), request.name(), request.subjectId()));
    }

    /** Input: authenticated owner and active library ID. Output: 204; source resources remain intact. Errors: 404. */
    @DeleteMapping("/{libraryId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID libraryId) {
        service.delete(userId(jwt), libraryId);
        return ResponseEntity.noContent().build();
    }

    /** Input: owned library and owned typed resource. Output: 200 refreshed library. Errors: 404/422. */
    @PostMapping("/{libraryId}/items")
    public TeacherResourceLibraryApi.Library addItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID libraryId,
            @Valid @RequestBody TeacherResourceLibraryApi.AddItemRequest request
    ) {
        return service.addItem(userId(jwt), libraryId, request.itemType(), request.itemId());
    }

    /** Input: owned library/item reference. Output: 204; source resource remains intact. Errors: 404. */
    @DeleteMapping("/{libraryId}/items/{itemReferenceId}")
    public ResponseEntity<Void> removeItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID libraryId,
            @PathVariable UUID itemReferenceId
    ) {
        service.removeItem(userId(jwt), libraryId, itemReferenceId);
        return ResponseEntity.noContent().build();
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException exception) { throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ."); }
    }
}
