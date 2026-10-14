package com.studyflow.enrollment.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, String> {

    Optional<CourseEnrollment> findByCourseOfferingIdAndStudentId(String courseOfferingId, String studentId);

    List<CourseEnrollment> findByCourseOfferingIdAndStatus(String courseOfferingId, EnrollmentStatus status);

    List<CourseEnrollment> findByCourseOfferingId(String courseOfferingId);

    List<CourseEnrollment> findByStudentIdAndStatus(String studentId, EnrollmentStatus status);

    List<CourseEnrollment> findByStudentIdAndCourseOfferingIdIn(String studentId, List<String> courseOfferingIds);

    List<CourseEnrollment> findByStudentIdAndStatusAndCourseOfferingIdIn(
            String studentId, EnrollmentStatus status, List<String> courseOfferingIds);

    List<CourseEnrollment> findByStudentId(String studentId);

    long countByCourseOfferingIdAndStatus(String courseOfferingId, EnrollmentStatus status);
}
