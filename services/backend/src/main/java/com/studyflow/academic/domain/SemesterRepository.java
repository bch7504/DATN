package com.studyflow.academic.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, String> {

    Optional<Semester> findByCode(String code);

    List<Semester> findByStatus(SemesterStatus status);
}
