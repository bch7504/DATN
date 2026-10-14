package com.studyflow.courseoffering.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseOfferingRepository extends JpaRepository<CourseOffering, String> {

    Optional<CourseOffering> findByJoinCodeHash(String joinCodeHash);

    List<CourseOffering> findByTeacherId(String teacherId);

    List<CourseOffering> findByTeacherIdAndSemesterId(String teacherId, String semesterId);

    List<CourseOffering> findByTeacherIdAndStatus(String teacherId, CourseOfferingStatus status);

    List<CourseOffering> findBySemesterId(String semesterId);

    long countBySubjectIdAndSemesterId(String subjectId, String semesterId);

    boolean existsBySemesterIdAndCode(String semesterId, String code);

    boolean existsBySemesterIdAndCodeAndIdNot(String semesterId, String code, String id);
}
