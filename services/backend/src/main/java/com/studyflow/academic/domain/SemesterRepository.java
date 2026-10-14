package com.studyflow.academic.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, UUID> {
    Optional<Semester> findByCode(String code);
    boolean existsByCode(String code);
    List<Semester> findByStatus(SemesterStatus status);
}
