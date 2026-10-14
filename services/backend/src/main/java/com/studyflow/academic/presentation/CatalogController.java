package com.studyflow.academic.presentation;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.SemesterStatus;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.academic.dto.SemesterDto;
import com.studyflow.academic.dto.SubjectDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/catalog")
public class CatalogController {

    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;

    public CatalogController(SubjectRepository subjectRepository, SemesterRepository semesterRepository) {
        this.subjectRepository = subjectRepository;
        this.semesterRepository = semesterRepository;
    }

    @GetMapping("/subjects")
    public ResponseEntity<List<SubjectDto>> getSubjects(@RequestParam(value = "status", required = false) String status) {
        List<Subject> subjects;
        if (status != null && !status.isBlank()) {
            subjects = subjectRepository.findByStatus(status.trim().toUpperCase());
        } else {
            subjects = subjectRepository.findAll();
        }

        List<SubjectDto> dtoList = subjects.stream()
                .map(SubjectDto::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtoList);
    }

    @GetMapping("/semesters")
    public ResponseEntity<List<SemesterDto>> getSemesters(@RequestParam(value = "status", required = false) SemesterStatus status) {
        List<Semester> semesters;
        if (status != null) {
            semesters = semesterRepository.findByStatus(status);
        } else {
            semesters = semesterRepository.findAll();
        }

        List<SemesterDto> dtoList = semesters.stream()
                .map(SemesterDto::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtoList);
    }
}
