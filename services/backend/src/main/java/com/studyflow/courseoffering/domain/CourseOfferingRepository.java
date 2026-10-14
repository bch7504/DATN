package com.studyflow.courseoffering.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseOfferingRepository extends JpaRepository<CourseOffering, UUID> {

    Optional<CourseOffering> findByJoinCodeHash(String joinCodeHash);

    List<CourseOffering> findByTeacherId(UUID teacherId);

    List<CourseOffering> findByTeacherIdAndSemesterId(UUID teacherId, UUID semesterId);

    List<CourseOffering> findByTeacherIdAndStatus(UUID teacherId, CourseOfferingStatus status);

    List<CourseOffering> findBySemesterId(UUID semesterId);

    long countBySubjectIdAndSemesterId(UUID subjectId, UUID semesterId);

    boolean existsBySemesterIdAndCode(UUID semesterId, String code);

    boolean existsBySemesterIdAndCodeAndIdNot(UUID semesterId, String code, UUID id);
}
