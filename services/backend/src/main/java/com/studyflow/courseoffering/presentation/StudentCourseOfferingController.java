package com.studyflow.courseoffering.presentation;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.courseoffering.application.CourseOfferingService;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.courseoffering.dto.StudentCourseOfferingResponse;
import com.studyflow.enrollment.application.CourseEnrollmentService;
import com.studyflow.user.domain.UserAccount;
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
@RequestMapping("/api/v1/student/course-offerings")
@PreAuthorize("hasRole('STUDENT')")
public class StudentCourseOfferingController {

    private final CourseEnrollmentService enrollmentService;
    private final CourseOfferingService offeringService;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;
    private final UserAccountStore userAccountStore;

    public StudentCourseOfferingController(CourseEnrollmentService enrollmentService,
                                           CourseOfferingService offeringService,
                                           SubjectRepository subjectRepository,
                                           SemesterRepository semesterRepository,
                                           UserAccountStore userAccountStore) {
        this.enrollmentService = enrollmentService;
        this.offeringService = offeringService;
        this.subjectRepository = subjectRepository;
        this.semesterRepository = semesterRepository;
        this.userAccountStore = userAccountStore;
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

    @GetMapping
    public ResponseEntity<List<StudentCourseOfferingResponse>> getApprovedOfferings(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "status", required = false) CourseOfferingStatus status) {
        UUID studentId = userId(jwt);
        List<CourseOffering> offerings = enrollmentService.getStudentApprovedOfferings(studentId);

        if (status != null) {
            offerings = offerings.stream().filter(o -> o.getStatus() == status).collect(Collectors.toList());
        }

        List<UUID> subjectIds = offerings.stream()
                .map(CourseOffering::getSubjectId)
                .distinct()
                .collect(Collectors.toList());
        List<UUID> semesterIds = offerings.stream()
                .map(CourseOffering::getSemesterId)
                .distinct()
                .collect(Collectors.toList());
        List<UUID> teacherIds = offerings.stream()
                .map(CourseOffering::getTeacherId)
                .distinct()
                .collect(Collectors.toList());

        Map<UUID, Subject> subjectMap = subjectRepository.findAllById(subjectIds).stream()
                .collect(Collectors.toMap(Subject::getId, s -> s, (s1, s2) -> s1));
        Map<UUID, Semester> semesterMap = semesterRepository.findAllById(semesterIds).stream()
                .collect(Collectors.toMap(Semester::getId, s -> s, (s1, s2) -> s1));
        Map<UUID, UserAccount> teacherMap = userAccountStore.findAllByIdIn(teacherIds).stream()
                .collect(Collectors.toMap(UserAccount::id, u -> u, (u1, u2) -> u1));

        List<StudentCourseOfferingResponse> responseList = offerings.stream()
                .map(o -> {
                    UserAccount teacher = teacherMap.get(o.getTeacherId());
                    return StudentCourseOfferingResponse.fromEntity(
                            o,
                            subjectMap.get(o.getSubjectId()),
                            semesterMap.get(o.getSemesterId()),
                            teacher != null ? teacher.fullName() : null,
                            teacher != null ? teacher.email() : null
                    );
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentCourseOfferingResponse> getOfferingDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id) {
        UUID studentId = userId(jwt);
        if (!enrollmentService.isStudentApproved(studentId, id)) {
            throw new ForbiddenException("FORBIDDEN", "Bạn chưa được duyệt tham gia lớp học phần này.");
        }

        CourseOffering offering = offeringService.getOfferingById(id);
        Subject subject = subjectRepository.findById(offering.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(offering.getSemesterId()).orElse(null);
        UserAccount teacher = userAccountStore.findById(offering.getTeacherId()).orElse(null);

        StudentCourseOfferingResponse response = StudentCourseOfferingResponse.fromEntity(
                offering,
                subject,
                semester,
                teacher != null ? teacher.fullName() : null,
                teacher != null ? teacher.email() : null
        );

        return ResponseEntity.ok(response);
    }
}
