package com.studyflow.courseoffering.presentation;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.security.SecurityUtils;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
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

    @PostMapping
    public ResponseEntity<TeacherCourseOfferingResponse> createCourseOffering(
            @Valid @RequestBody CreateCourseOfferingRequest req) {
        String teacherId = SecurityUtils.getCurrentUserId();

        CreateCourseOfferingCommand cmd = new CreateCourseOfferingCommand(
                req.getSubjectId(),
                req.getSemesterId(),
                req.getCode(),
                req.getName()
        );

        CreatedCourseOfferingResult result = offeringService.createCourseOffering(teacherId, cmd);
        Subject subject = subjectRepository.findById(result.getOffering().getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(result.getOffering().getSemesterId()).orElse(null);

        TeacherCourseOfferingResponse response = TeacherCourseOfferingResponse.fromEntity(
                result.getOffering(),
                subject,
                semester,
                result.getRawJoinCode()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<TeacherCourseOfferingResponse>> getTeacherOfferings(
            @RequestParam(value = "semesterId", required = false) String semesterId,
            @RequestParam(value = "status", required = false) CourseOfferingStatus status) {
        String teacherId = SecurityUtils.getCurrentUserId();
        List<CourseOffering> offerings = offeringService.getTeacherOfferings(teacherId, semesterId, status);

        List<String> subjectIds = offerings.stream()
                .map(CourseOffering::getSubjectId)
                .distinct()
                .collect(Collectors.toList());
        List<String> semesterIds = offerings.stream()
                .map(CourseOffering::getSemesterId)
                .distinct()
                .collect(Collectors.toList());
        Map<String, Subject> subjectMap = subjectRepository.findAllById(subjectIds).stream()
                .collect(Collectors.toMap(Subject::getId, s -> s, (s1, s2) -> s1));
        Map<String, Semester> semesterMap = semesterRepository.findAllById(semesterIds).stream()
                .collect(Collectors.toMap(Semester::getId, s -> s, (s1, s2) -> s1));

        List<TeacherCourseOfferingResponse> responseList = offerings.stream()
                .map(o -> TeacherCourseOfferingResponse.fromEntity(
                        o,
                        subjectMap.get(o.getSubjectId()),
                        semesterMap.get(o.getSemesterId()),
                        null // raw code is not returned in listing
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeacherCourseOfferingResponse> getOfferingById(@PathVariable("id") String id) {
        String teacherId = SecurityUtils.getCurrentUserId();
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

    /**
     * Updates code and/or display name of an ACTIVE offering owned by the teacher.
     *
     * Contract:
     * - args: id is the offering identifier; request contains optional code/name.
     * - input: authenticated TEACHER must own the offering; at least one field is non-blank.
     * - output: HTTP 200 with the updated offering; rawJoinCode is absent.
     * - errors: 404 not found, 403 not owner, 409 locked/duplicate code,
     *   422 invalid or empty patch.
     */
    @PatchMapping("/{id}")
    public ResponseEntity<TeacherCourseOfferingResponse> updateOffering(
            @PathVariable("id") String id,
            @Valid @RequestBody UpdateCourseOfferingRequest req) {
        String teacherId = SecurityUtils.getCurrentUserId();
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
    public ResponseEntity<TeacherCourseOfferingResponse> archiveOffering(@PathVariable("id") String id) {
        String teacherId = SecurityUtils.getCurrentUserId();
        CourseOffering archived = offeringService.archiveOffering(teacherId, id);

        Subject subject = subjectRepository.findById(archived.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(archived.getSemesterId()).orElse(null);

        return ResponseEntity.ok(TeacherCourseOfferingResponse.fromEntity(archived, subject, semester, null));
    }

    @PostMapping("/{id}/join-code/regenerate")
    public ResponseEntity<TeacherCourseOfferingResponse> regenerateJoinCode(@PathVariable("id") String id) {
        String teacherId = SecurityUtils.getCurrentUserId();
        String newRawCode = offeringService.regenerateJoinCode(teacherId, id);

        CourseOffering updated = offeringService.getOfferingById(id);
        Subject subject = subjectRepository.findById(updated.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(updated.getSemesterId()).orElse(null);

        return ResponseEntity.ok(TeacherCourseOfferingResponse.fromEntity(updated, subject, semester, newRawCode));
    }

    @PatchMapping("/{id}/join-code")
    public ResponseEntity<TeacherCourseOfferingResponse> toggleJoinCode(
            @PathVariable("id") String id,
            @Valid @RequestBody ToggleJoinCodeRequest req) {
        String teacherId = SecurityUtils.getCurrentUserId();
        CourseOffering updated = offeringService.toggleJoinCode(teacherId, id, req.getEnabled());

        Subject subject = subjectRepository.findById(updated.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(updated.getSemesterId()).orElse(null);

        return ResponseEntity.ok(TeacherCourseOfferingResponse.fromEntity(updated, subject, semester, null));
    }
}
