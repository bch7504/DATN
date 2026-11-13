package com.studyflow.courseoffering.presentation;

import com.studyflow.common.api.RequestIdFilter;
import com.studyflow.common.exception.ApiException;
import com.studyflow.courseoffering.application.OpeningRequestService;
import com.studyflow.courseoffering.dto.OpeningRequestModels.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/** Teacher submits proposals; only Admin endpoints decide. Response never contains join codes. */
@RestController
@RequestMapping("/api/v1")
public class OpeningRequestController {
    private final OpeningRequestService service;
    /** Args: managed service. Output: controller. Errors: none. */
    public OpeningRequestController(OpeningRequestService service) { this.service=service; }
    /** Args: Teacher JWT and validated proposal. Output: 201 PENDING. Errors: 401/403/404/409/422. */
    @PostMapping("/teacher/course-opening-requests") @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<OpeningRequest> submit(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Submit input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.submit(actor(jwt),input));
    }
    /** Args: Teacher, page>=0/size1..100 defaults0/20. Output: 200 own proposals only. Errors: 401/403/422. */
    @GetMapping("/teacher/course-opening-requests") @PreAuthorize("hasRole('TEACHER')")
    public Page teacherList(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return service.list(actor(jwt),null,page,size);
    }
    /** Args: optional status, bounded pagination defaults0/20. Output: 200 Admin list. Errors: 401/403/422. */
    @GetMapping("/admin/course-opening-requests") @PreAuthorize("hasRole('ADMIN')")
    public Page adminList(@RequestParam(required=false) String status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return service.list(null,status,page,size);
    }
    /** Args: Admin, request UUID, canonical fields and trace context. Output: 200 APPROVED. Errors: 401/403/404/409/422. */
    @PostMapping("/admin/course-opening-requests/{id}/approve") @PreAuthorize("hasRole('ADMIN')")
    public OpeningRequest approve(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody Approve input,HttpServletRequest request) {
        return service.approve(actor(jwt),id,input,String.valueOf(request.getAttribute(RequestIdFilter.ATTRIBUTE)));
    }
    /** Args: Admin, UUID, nonblank rejection reason and trace. Output: 200 REJECTED. Errors: 401/403/404/409/422. */
    @PostMapping("/admin/course-opening-requests/{id}/reject") @PreAuthorize("hasRole('ADMIN')")
    public OpeningRequest reject(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody Reject input,HttpServletRequest request) {
        return service.reject(actor(jwt),id,input.reason(),String.valueOf(request.getAttribute(RequestIdFilter.ATTRIBUTE)));
    }
    /** Args: authenticated JWT. Returns: actor UUID. Errors: 401 missing/invalid identity. */
    private static UUID actor(Jwt jwt) {
        try { return UUID.fromString(jwt.getSubject()); }
        catch(IllegalArgumentException | NullPointerException error) { throw new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_SESSION","Phiên đăng nhập không hợp lệ."); }
    }
}
