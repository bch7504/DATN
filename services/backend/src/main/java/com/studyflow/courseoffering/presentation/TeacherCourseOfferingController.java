package com.studyflow.courseoffering.presentation;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.courseoffering.application.CourseOfferingService;
import com.studyflow.courseoffering.application.CreateCourseOfferingCommand;
import com.studyflow.courseoffering.application.CreatedCourseOfferingResult;
import com.studyflow.courseoffering.application.UpdateCourseOfferingCommand;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.courseoffering.dto.CreateCourseOfferingRequest;
import com.studyflow.courseoffering.dto.TeacherCourseOfferingResponse;
import com.studyflow.courseoffering.dto.ToggleJoinCodeRequest;
import com.studyflow.courseoffering.dto.UpdateCourseOfferingRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/teacher/course-offerings")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherCourseOfferingController {

    private final CourseOfferingService offeringService;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;

    public TeacherCourseOfferingController(CourseOfferingService offeringService,
                                           SubjectRepository subjectRepository,
                                           SemesterRepository semesterRepository) {
        this.offeringService = offeringService;
        this.subjectRepository = subjectRepository;
        this.semesterRepository = semesterRepository;
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
        }
    }

    @PostMapping
    public ResponseEntity<TeacherCourseOfferingResponse> createCourseOffering(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateCourseOfferingRequest req) {
        UUID teacherId = userId(jwt);

        CreateCourseOfferingCommand cmd = new CreateCourseOfferingCommand(
                req.getSubjectId(),
                req.getSemesterId(),
                req.getCode(),
                req.getName()
        );

        CreatedCourseOfferingResult result = offeringService.createCourseOffering(teacherId, cmd);
        Subject subject = subjectRepository.findById(result.offering().getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(result.offering().getSemesterId()).orElse(null);

        TeacherCourseOfferingResponse response = TeacherCourseOfferingResponse.fromEntity(
                result.offering(),
                subject,
                semester,
                result.rawJoinCode()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<TeacherCourseOfferingResponse>> getTeacherOfferings(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "semesterId", required = false) UUID semesterId,
            @RequestParam(value = "status", required = false) CourseOfferingStatus status) {
        UUID teacherId = userId(jwt);
        List<CourseOffering> offerings = offeringService.getTeacherOfferings(teacherId, semesterId, status);

        List<UUID> subjectIds = offerings.stream()
                .map(CourseOffering::getSubjectId)
                .distinct()
                .collect(Collectors.toList());
        List<UUID> semesterIds = offerings.stream()
                .map(CourseOffering::getSemesterId)
                .distinct()
                .collect(Collectors.toList());
        Map<UUID, Subject> subjectMap = subjectRepository.findAllById(subjectIds).stream()
                .collect(Collectors.toMap(Subject::getId, s -> s, (s1, s2) -> s1));
        Map<UUID, Semester> semesterMap = semesterRepository.findAllById(semesterIds).stream()
                .collect(Collectors.toMap(Semester::getId, s -> s, (s1, s2) -> s1));

        List<TeacherCourseOfferingResponse> responseList = offerings.stream()
                .map(o -> TeacherCourseOfferingResponse.fromEntity(
                        o,
                        subjectMap.get(o.getSubjectId()),
                        semesterMap.get(o.getSemesterId()),
                        null
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeacherCourseOfferingResponse> getOfferingById(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id) {
        UUID teacherId = userId(jwt);
        CourseOffering offering = offeringService.getOfferingById(id);

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Bạn không có quyền xem thông tin Lớp học phần này.");
        }

        Subject subject = subjectRepository.findById(offering.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(offering.getSemesterId()).orElse(null);

        TeacherCourseOfferingResponse res = TeacherCourseOfferingResponse.fromEntity(
                offering, subject, semester, null
        );
        return ResponseEntity.ok(res);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TeacherCourseOfferingResponse> updateOffering(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateCourseOfferingRequest req) {
        UUID teacherId = userId(jwt);
        CourseOffering updated = offeringService.updateCourseOffering(
                teacherId,
                id,
                new UpdateCourseOfferingCommand(req.getCode(), req.getName())
        );

        Subject subject = subjectRepository.findById(updated.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(updated.getSemesterId()).orElse(null);
        return ResponseEntity.ok(TeacherCourseOfferingResponse.fromEntity(
                updated, subject, semester, null
        ));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<TeacherCourseOfferingResponse> archiveOffering(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id) {
        UUID teacherId = userId(jwt);
        CourseOffering archived = offeringService.archiveOffering(teacherId, id);

        Subject subject = subjectRepository.findById(archived.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(archived.getSemesterId()).orElse(null);

        return ResponseEntity.ok(TeacherCourseOfferingResponse.fromEntity(archived, subject, semester, null));
    }

    @PostMapping("/{id}/join-code/regenerate")
    public ResponseEntity<TeacherCourseOfferingResponse> regenerateJoinCode(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id) {
        UUID teacherId = userId(jwt);
        String newRawCode = offeringService.regenerateJoinCode(teacherId, id);

        CourseOffering updated = offeringService.getOfferingById(id);
        Subject subject = subjectRepository.findById(updated.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(updated.getSemesterId()).orElse(null);

        return ResponseEntity.ok(TeacherCourseOfferingResponse.fromEntity(updated, subject, semester, newRawCode));
    }

    @PatchMapping("/{id}/join-code/toggle")
    public ResponseEntity<TeacherCourseOfferingResponse> toggleJoinCode(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id,
            @RequestBody ToggleJoinCodeRequest req) {
        UUID teacherId = userId(jwt);
        CourseOffering updated = offeringService.toggleJoinCode(teacherId, id, req.isEnabled());

        Subject subject = subjectRepository.findById(updated.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(updated.getSemesterId()).orElse(null);

        return ResponseEntity.ok(TeacherCourseOfferingResponse.fromEntity(updated, subject, semester, null));
    }
}
