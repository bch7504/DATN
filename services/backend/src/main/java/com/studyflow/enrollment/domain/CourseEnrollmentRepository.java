package com.studyflow.enrollment.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, UUID> {

    Optional<CourseEnrollment> findByCourseOfferingIdAndStudentId(UUID courseOfferingId, UUID studentId);

    List<CourseEnrollment> findByCourseOfferingIdAndStatus(UUID courseOfferingId, EnrollmentStatus status);

    List<CourseEnrollment> findByCourseOfferingId(UUID courseOfferingId);

    List<CourseEnrollment> findByStudentIdAndStatus(UUID studentId, EnrollmentStatus status);

    List<CourseEnrollment> findByStudentIdAndCourseOfferingIdIn(UUID studentId, Collection<UUID> courseOfferingIds);

    List<CourseEnrollment> findByStudentIdAndStatusAndCourseOfferingIdIn(
            UUID studentId, EnrollmentStatus status, Collection<UUID> courseOfferingIds);

    List<CourseEnrollment> findByStudentId(UUID studentId);

    long countByCourseOfferingIdAndStatus(UUID courseOfferingId, EnrollmentStatus status);
}
