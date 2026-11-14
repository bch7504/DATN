package com.studyflow.academic.presentation;

import com.studyflow.academic.application.TeacherSubjectService;
import com.studyflow.admin.api.AdminModels;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** The Teacher reads only the subject assigned to their authenticated identity. */
@RestController
public class TeacherSubjectController {
    private final TeacherSubjectService service;
    /** Args: assignment policy. Output: controller; errors: none. */
    public TeacherSubjectController(TeacherSubjectService service) {this.service=service;}
    /** Args: Teacher JWT. Input: no client identity parameters. Output: 200 Subject; errors: 401/403/409. */
    @GetMapping("/api/v1/teacher/subject") @PreAuthorize("hasRole('TEACHER')")
    public AdminModels.Subject assigned(@AuthenticationPrincipal Jwt jwt) {
        var subject=service.assigned(UUID.fromString(jwt.getSubject()));
        return new AdminModels.Subject(subject.getId(),subject.getCode(),subject.getName(),subject.getCredits(),subject.getDescription(),subject.getStatus());
    }
}
