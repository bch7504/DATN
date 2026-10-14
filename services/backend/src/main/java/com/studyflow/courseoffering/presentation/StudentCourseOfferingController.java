package com.studyflow.courseoffering.presentation;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.security.SecurityUtils;
import com.studyflow.courseoffering.application.CourseOfferingService;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.courseoffering.dto.StudentCourseOfferingResponse;
import com.studyflow.enrollment.application.CourseEnrollmentService;
import com.studyflow.user.domain.User;
import com.studyflow.user.domain.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/student/course-offerings")
@PreAuthorize("hasRole('STUDENT')")
public class StudentCourseOfferingController {

    private final CourseEnrollmentService enrollmentService;
    private final CourseOfferingService offeringService;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;

    public StudentCourseOfferingController(CourseEnrollmentService enrollmentService,
                                           CourseOfferingService offeringService,
                                           SubjectRepository subjectRepository,
                                           SemesterRepository semesterRepository,
                                           UserRepository userRepository) {
        this.enrollmentService = enrollmentService;
        this.offeringService = offeringService;
        this.subjectRepository = subjectRepository;
        this.semesterRepository = semesterRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<StudentCourseOfferingResponse>> getApprovedOfferings(
            @RequestParam(value = "status", required = false) CourseOfferingStatus status) {
        String studentId = SecurityUtils.getCurrentUserId();
        List<CourseOffering> offerings = enrollmentService.getStudentApprovedOfferings(studentId);

        if (status != null) {
            offerings = offerings.stream().filter(o -> o.getStatus() == status).collect(Collectors.toList());
        }

        List<String> subjectIds = offerings.stream()
                .map(CourseOffering::getSubjectId)
                .distinct()
                .collect(Collectors.toList());
        List<String> semesterIds = offerings.stream()
                .map(CourseOffering::getSemesterId)
                .distinct()
                .collect(Collectors.toList());
        List<String> teacherIds = offerings.stream()
                .map(CourseOffering::getTeacherId)
                .distinct()
                .collect(Collectors.toList());

        Map<String, Subject> subjectMap = subjectRepository.findAllById(subjectIds).stream()
                .collect(Collectors.toMap(Subject::getId, s -> s, (s1, s2) -> s1));
        Map<String, Semester> semesterMap = semesterRepository.findAllById(semesterIds).stream()
                .collect(Collectors.toMap(Semester::getId, s -> s, (s1, s2) -> s1));
        Map<String, User> userMap = userRepository.findAllById(teacherIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u, (u1, u2) -> u1));

        List<StudentCourseOfferingResponse> responseList = offerings.stream()
                .map(o -> StudentCourseOfferingResponse.from(
                        o,
                        subjectMap.get(o.getSubjectId()),
                        semesterMap.get(o.getSemesterId()),
                        userMap.get(o.getTeacherId())
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentCourseOfferingResponse> getOfferingDetail(@PathVariable("id") String offeringId) {
        String studentId = SecurityUtils.getCurrentUserId();
        if (!enrollmentService.isStudentApproved(studentId, offeringId)) {
            throw new ForbiddenException("ENROLLMENT_REQUIRED", "Bạn chưa được duyệt vào lớp học phần này.");
        }

        CourseOffering offering = offeringService.getOfferingById(offeringId);
        Subject subject = subjectRepository.findById(offering.getSubjectId()).orElse(null);
        Semester semester = semesterRepository.findById(offering.getSemesterId()).orElse(null);
        User teacher = userRepository.findById(offering.getTeacherId()).orElse(null);

        return ResponseEntity.ok(StudentCourseOfferingResponse.from(offering, subject, semester, teacher));
    }
}
