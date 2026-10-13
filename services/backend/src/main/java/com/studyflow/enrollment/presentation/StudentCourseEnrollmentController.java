package com.studyflow.enrollment.presentation;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.security.SecurityUtils;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.application.CourseEnrollmentService;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.enrollment.dto.JoinCourseRequest;
import com.studyflow.enrollment.dto.StudentEnrollmentResponse;
import com.studyflow.user.domain.User;
import com.studyflow.user.domain.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/student/course-enrollments")
@PreAuthorize("hasRole('STUDENT')")
public class StudentCourseEnrollmentController {

    private final CourseEnrollmentService enrollmentService;
    private final CourseOfferingRepository offeringRepository;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;

    public StudentCourseEnrollmentController(CourseEnrollmentService enrollmentService,
                                            CourseOfferingRepository offeringRepository,
                                            SubjectRepository subjectRepository,
                                            SemesterRepository semesterRepository,
                                            UserRepository userRepository) {
        this.enrollmentService = enrollmentService;
        this.offeringRepository = offeringRepository;
        this.subjectRepository = subjectRepository;
        this.semesterRepository = semesterRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/join")
    public ResponseEntity<StudentEnrollmentResponse> joinCourse(@Valid @RequestBody JoinCourseRequest req) {
        String studentId = SecurityUtils.getCurrentUserId();
        CourseEnrollment enrollment = enrollmentService.joinByCode(studentId, req.getJoinCode());

        CourseOffering offering = offeringRepository.findById(enrollment.getCourseOfferingId()).orElse(null);
        Subject subject = offering != null ? subjectRepository.findById(offering.getSubjectId()).orElse(null) : null;
        Semester semester = offering != null ? semesterRepository.findById(offering.getSemesterId()).orElse(null) : null;
        User teacher = offering != null ? userRepository.findById(offering.getTeacherId()).orElse(null) : null;

        StudentEnrollmentResponse response = StudentEnrollmentResponse.from(
                enrollment, offering, subject, semester, teacher
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<StudentEnrollmentResponse>> getMyEnrollments(
            @RequestParam(value = "semesterId", required = false) String semesterId,
            @RequestParam(value = "status", required = false) EnrollmentStatus status) {
        String studentId = SecurityUtils.getCurrentUserId();
        List<CourseEnrollment> enrollments = enrollmentService.getStudentEnrollments(studentId, semesterId, status);

        List<String> offeringIds = enrollments.stream()
                .map(CourseEnrollment::getCourseOfferingId)
                .distinct()
                .collect(Collectors.toList());
        Map<String, CourseOffering> offeringMap = offeringRepository.findAllById(offeringIds).stream()
                .collect(Collectors.toMap(CourseOffering::getId, o -> o, (o1, o2) -> o1));
        List<String> subjectIds = offeringMap.values().stream()
                .map(CourseOffering::getSubjectId)
                .distinct()
                .collect(Collectors.toList());
        List<String> semesterIds = offeringMap.values().stream()
                .map(CourseOffering::getSemesterId)
                .distinct()
                .collect(Collectors.toList());
        Map<String, Subject> subjectMap = subjectRepository.findAllById(subjectIds).stream()
                .collect(Collectors.toMap(Subject::getId, s -> s, (s1, s2) -> s1));
        Map<String, Semester> semesterMap = semesterRepository.findAllById(semesterIds).stream()
                .collect(Collectors.toMap(Semester::getId, s -> s, (s1, s2) -> s1));
        List<String> teacherIds = offeringMap.values().stream()
                .map(CourseOffering::getTeacherId)
                .distinct()
                .collect(Collectors.toList());
        Map<String, User> userMap = userRepository.findAllById(teacherIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u, (u1, u2) -> u1));

        List<StudentEnrollmentResponse> responses = enrollments.stream().map(e -> {
            CourseOffering off = offeringMap.get(e.getCourseOfferingId());
            Subject subj = off != null ? subjectMap.get(off.getSubjectId()) : null;
            Semester sem = off != null ? semesterMap.get(off.getSemesterId()) : null;
            User teacher = off != null ? userMap.get(off.getTeacherId()) : null;
            return StudentEnrollmentResponse.from(e, off, subj, sem, teacher);
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }
}
