package com.studyflow.admin.api;

import com.studyflow.admin.application.AdminService;
import com.studyflow.common.api.RequestIdFilter;
import com.studyflow.common.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only public API; every response excludes private document and learning content. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final AdminService service;

    /** Args: managed Admin service. Input: Spring dependency. Output: controller. Errors: none. */
    public AdminController(AdminService service) { this.service = service; }

    /** Args: authenticated Admin. Input: aggregate app metadata. Output: 200 dashboard. Errors: 401/403. */
    @GetMapping("/dashboard")
    public AdminModels.Dashboard dashboard() { return service.dashboard(); }

    /** Args: optional role/status, page >= 0, size 1..100. Output: 200 user metadata page. Errors: 422. */
    @GetMapping("/users")
    public AdminModels.Page<AdminModels.User> users(@RequestParam(required = false) String role,
            @RequestParam(required = false) String status, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) { return service.users(role, status, page, size); }

    /** Args: Admin JWT, target UUID, optional role/status and trace. Output: 200 updated account.
     * Errors: 401/403/404/409/422; revokes previous sessions on change. */
    @PatchMapping("/users/{id}")
    public AdminModels.User updateUser(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @RequestBody AdminModels.UserUpdate body, HttpServletRequest request) {
        return service.updateUser(actor(jwt), id, body, trace(request));
    }

    /** Args: bounded page/size. Output: 200 Subject page. Errors: 422. */
    @GetMapping("/subjects")
    public AdminModels.Page<AdminModels.Subject> subjects(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) { return service.subjects(page, size); }

    /** Args: Admin, required Subject fields and trace. Output: 201 Subject; insert/audit. Errors: 409/422. */
    @PostMapping("/subjects")
    public ResponseEntity<AdminModels.Subject> createSubject(@AuthenticationPrincipal Jwt jwt,
            @RequestBody AdminModels.SubjectInput body, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createSubject(actor(jwt), body, trace(request)));
    }

    /** Args: Admin, Subject UUID, partial fields and trace. Output: 200 Subject. Errors: 404/409/422. */
    @PatchMapping("/subjects/{id}")
    public AdminModels.Subject updateSubject(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @RequestBody AdminModels.SubjectInput body, HttpServletRequest request) {
        return service.updateSubject(actor(jwt), id, body, trace(request));
    }

    /** Args: Admin, unused Subject UUID and trace. Output: 204; delete/audit. Errors: 404/409. */
    @DeleteMapping("/subjects/{id}")
    public ResponseEntity<Void> deleteSubject(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            HttpServletRequest request) {
        service.deleteSubject(actor(jwt), id, trace(request));
        return ResponseEntity.noContent().build();
    }

    /** Args: bounded page/size. Output: 200 Semester page. Errors: 422. */
    @GetMapping("/semesters")
    public AdminModels.Page<AdminModels.Semester> semesters(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) { return service.semesters(page, size); }

    /** Args: Admin, full Semester fields and trace. Output: 201 Semester; insert/audit. Errors: 409/422. */
    @PostMapping("/semesters")
    public ResponseEntity<AdminModels.Semester> createSemester(@AuthenticationPrincipal Jwt jwt,
            @RequestBody AdminModels.SemesterInput body, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createSemester(actor(jwt), body, trace(request)));
    }

    /** Args: Admin, Semester UUID, partial fields and trace. Output: 200 Semester. Errors: 404/409/422. */
    @PatchMapping("/semesters/{id}")
    public AdminModels.Semester updateSemester(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @RequestBody AdminModels.SemesterInput body, HttpServletRequest request) {
        return service.updateSemester(actor(jwt), id, body, trace(request));
    }

    /** Args: Admin, unused Semester UUID and trace. Output: 204; delete/audit. Errors: 404/409. */
    @DeleteMapping("/semesters/{id}")
    public ResponseEntity<Void> deleteSemester(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            HttpServletRequest request) {
        service.deleteSemester(actor(jwt), id, trace(request));
        return ResponseEntity.noContent().build();
    }

    /** Args: optional status and bounded page/size. Output: 200 Offering metadata page. Errors: 422. */
    @GetMapping("/course-offerings")
    public AdminModels.Page<AdminModels.Offering> offerings(@RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.offerings(status, page, size);
    }

    /** Args: Offering UUID. Output: 200 safe Offering metadata. Errors: 404. */
    @GetMapping("/course-offerings/{id}")
    public AdminModels.Offering offering(@PathVariable UUID id) { return service.offering(id); }

    /** Args: Admin, active Offering UUID and trace. Output: 200 LOCKED Offering; disables join. Errors: 404/409. */
    @PostMapping("/course-offerings/{id}/lock")
    public AdminModels.Offering lock(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            HttpServletRequest request) { return service.transitionOffering(actor(jwt), id, "LOCKED", trace(request)); }

    /** Args: Admin, active Offering UUID and trace. Output: 200 ARCHIVED Offering; disables join. Errors: 404/409. */
    @PostMapping("/course-offerings/{id}/archive")
    public AdminModels.Offering archive(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            HttpServletRequest request) { return service.transitionOffering(actor(jwt), id, "ARCHIVED", trace(request)); }

    /** Args: optional status and bounded page/size. Output: 200 feedback page. Errors: 422. */
    @GetMapping("/feedback-reports")
    public AdminModels.Page<AdminModels.Feedback> feedback(@RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.feedback(status, page, size);
    }

    /** Args: Admin, report UUID, status/resolution and trace. Output: 200 updated report. Errors: 404/422. */
    @PatchMapping("/feedback-reports/{id}")
    public AdminModels.Feedback updateFeedback(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @RequestBody AdminModels.FeedbackUpdate body, HttpServletRequest request) {
        return service.updateFeedback(actor(jwt), id, body, trace(request));
    }

    /** Args: bounded page/size. Output: 200 safe audit event page. Errors: 422. */
    @GetMapping("/system-logs")
    public AdminModels.Page<AdminModels.SystemLog> logs(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) { return service.systemLogs(page, size); }

    /** Args: none. Output: 200 enforced runtime settings. Errors: 401/403. */
    @GetMapping("/system-settings")
    public AdminModels.Settings settings() { return service.settings(); }

    /** Args: Admin, required registration flag and trace. Output: 200 settings; update/audit. Errors: 422. */
    @PatchMapping("/system-settings")
    public AdminModels.Settings updateSettings(@AuthenticationPrincipal Jwt jwt,
            @RequestBody AdminModels.SettingsUpdate body, HttpServletRequest request) {
        return service.updateSettings(actor(jwt), body, trace(request));
    }

    /** Args: signed Admin JWT. Output: actor UUID. Errors: 401 INVALID_SESSION. */
    private static UUID actor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) throw invalidSession();
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException exception) { throw invalidSession(); }
    }

    /** Args: servlet request carrying filter request ID. Output: safe trace ID or null. Errors: none. */
    private static String trace(HttpServletRequest request) {
        Object value = request.getAttribute(RequestIdFilter.ATTRIBUTE);
        return value instanceof String id ? id : null;
    }

    /** Args: none. Output: 401 error object. Errors: none. */
    private static ApiException invalidSession() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ.");
    }
}
