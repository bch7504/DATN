package com.studyflow.courseoffering.application;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.common.util.JoinCodeUtils;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Application service managing Teacher Course Offerings, lifecycle transitions, and Join Code security.
 */
@Service
public class CourseOfferingService {

    private final CourseOfferingRepository offeringRepository;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;

    public CourseOfferingService(CourseOfferingRepository offeringRepository,
                                 SubjectRepository subjectRepository,
                                 SemesterRepository semesterRepository) {
        this.offeringRepository = offeringRepository;
        this.subjectRepository = subjectRepository;
        this.semesterRepository = semesterRepository;
    }

    /**
     * Creates a new Course Offering for the authenticated Teacher.
     *
     * Contract:
     * - args: teacherId (String, required), cmd (CreateCourseOfferingCommand, required)
     * - input: Teacher is authenticated. Subject and Semester must be valid and ACTIVE.
     * - output: CreatedCourseOfferingResult containing persisted entity and plain join code.
     * - errors:
     *     - ResourceNotFoundException: SUBJECT_NOT_FOUND, SEMESTER_NOT_FOUND
     *     - ConflictException: SEMESTER_NOT_ACTIVE, COURSE_CODE_EXISTS
     */
    @Transactional
    public CreatedCourseOfferingResult createCourseOffering(String teacherId, CreateCourseOfferingCommand cmd) {
        Subject subject = subjectRepository.findById(cmd.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("SUBJECT_NOT_FOUND", "Không tìm thấy Môn học được chỉ định."));

        Semester semester = semesterRepository.findById(cmd.getSemesterId())
                .orElseThrow(() -> new ResourceNotFoundException("SEMESTER_NOT_FOUND", "Không tìm thấy Học kỳ được chỉ định."));

        if (!semester.canCreateCourseOffering()) {
            throw new ConflictException("SEMESTER_NOT_ACTIVE", "Học kỳ này hiện không mở cho phép tạo Lớp học phần mới.");
        }

        // Determine offering code
        String offeringCode = cmd.getCode();
        if (offeringCode == null || offeringCode.isBlank()) {
            long existingCount = offeringRepository.countBySubjectIdAndSemesterId(
                    subject.getId(), semester.getId());
            int suffix = Math.max(1, (int) existingCount + 1);
            do {
                offeringCode = subject.getCode() + "_" + String.format("%02d", suffix++);
            } while (offeringRepository.existsBySemesterIdAndCode(semester.getId(), offeringCode));
        } else {
            offeringCode = offeringCode.trim().toUpperCase();
            if (offeringRepository.existsBySemesterIdAndCode(semester.getId(), offeringCode)) {
                throw new ConflictException("COURSE_CODE_EXISTS", "Mã lớp học phần '" + offeringCode + "' đã tồn tại trong học kỳ này.");
            }
        }

        String offeringName = cmd.getName();
        if (offeringName == null || offeringName.isBlank()) {
            offeringName = subject.getName() + " (" + offeringCode + ")";
        } else {
            offeringName = offeringName.trim();
        }

        // Generate Join Code and SHA-256 hash
        String rawJoinCode = JoinCodeUtils.generateRandomCode(subject.getCode(), 6);
        String joinCodeHash = JoinCodeUtils.sha256Hex(rawJoinCode);
        String joinCodeHint = JoinCodeUtils.extractHint(rawJoinCode);

        String offeringId = "offering_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        CourseOffering offering = new CourseOffering(
                offeringId,
                subject.getId(),
                semester.getId(),
                teacherId,
                offeringCode,
                offeringName,
                joinCodeHash,
                joinCodeHint
        );

        CourseOffering saved = offeringRepository.save(offering);
        return new CreatedCourseOfferingResult(saved, rawJoinCode);
    }

    /**
     * Updates metadata of an ACTIVE offering owned by the authenticated teacher.
     *
     * Contract:
     * - args: teacherId (required), offeringId (required), command (required).
     * - input: command supplies code and/or name; null fields remain unchanged.
     * - output: updated CourseOffering, persisted in the current transaction.
     * - errors: ResourceNotFoundException COURSE_NOT_FOUND; ForbiddenException
     *   FORBIDDEN; ValidationException NO_FIELDS_TO_UPDATE; ConflictException
     *   COURSE_LOCKED or COURSE_CODE_EXISTS.
     */
    @Transactional
    public CourseOffering updateCourseOffering(String teacherId, String offeringId,
                                               UpdateCourseOfferingCommand command) {
        if (command == null || ((command.code() == null || command.code().isBlank())
                && (command.name() == null || command.name().isBlank()))) {
            throw new ValidationException("NO_FIELDS_TO_UPDATE",
                    "Cần cung cấp mã lớp hoặc tên lớp để cập nhật.");
        }

        CourseOffering offering = offeringRepository.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND",
                        "Không tìm thấy Lớp học phần."));

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN",
                    "Bạn không có quyền cập nhật Lớp học phần này.");
        }
        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ConflictException("COURSE_LOCKED",
                    "Không thể cập nhật lớp đã bị khóa hoặc lưu trữ.");
        }

        String code = command.code() == null ? offering.getCode() : command.code().trim().toUpperCase();
        String name = command.name() == null ? offering.getName() : command.name().trim();
        if (code.isBlank() || name.isBlank()) {
            throw new ValidationException("INVALID_METADATA",
                    "Mã lớp và tên lớp không được để trống.");
        }
        if (!code.equals(offering.getCode())
                && offeringRepository.existsBySemesterIdAndCodeAndIdNot(
                offering.getSemesterId(), code, offering.getId())) {
            throw new ConflictException("COURSE_CODE_EXISTS",
                    "Mã lớp học phần '" + code + "' đã tồn tại trong học kỳ này.");
        }

        offering.updateMetadata(code, name);
        return offeringRepository.save(offering);
    }

    /**
     * Regenerates a new Join Code for an existing Course Offering owned by the teacher.
     *
     * Contract:
     * - args: teacherId (String, required), offeringId (String, required)
     * - input: Teacher owns the offering. Offering is ACTIVE.
     * - output: String new raw Join Code
     * - errors:
     *     - ResourceNotFoundException: COURSE_NOT_FOUND
     *     - ForbiddenException: FORBIDDEN
     *     - ConflictException: COURSE_LOCKED
     */
    @Transactional
    public String regenerateJoinCode(String teacherId, String offeringId) {
        CourseOffering offering = offeringRepository.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần."));

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Bạn không có quyền quản lý Lớp học phần này.");
        }

        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ConflictException("COURSE_LOCKED", "Không thể tạo lại mã tham gia khi lớp đã bị khóa hoặc lưu trữ.");
        }

        String rawCode = JoinCodeUtils.generateRandomCode("JOIN", 6);
        String hash = JoinCodeUtils.sha256Hex(rawCode);
        String hint = JoinCodeUtils.extractHint(rawCode);

        offering.updateJoinCode(hash, hint);
        offeringRepository.save(offering);

        return rawCode;
    }

    /**
     * Toggles whether the offering accepts new join requests.
     */
    @Transactional
    public CourseOffering toggleJoinCode(String teacherId, String offeringId, boolean enabled) {
        CourseOffering offering = offeringRepository.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần."));

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Bạn không có quyền quản lý Lớp học phần này.");
        }

        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ConflictException("COURSE_LOCKED",
                    "Không thể bật/tắt mã tham gia khi lớp đã bị khóa hoặc lưu trữ.");
        }

        offering.toggleJoinCode(enabled);
        return offeringRepository.save(offering);
    }

    /**
     * Archives a Course Offering when semester concludes.
     */
    @Transactional
    public CourseOffering archiveOffering(String teacherId, String offeringId) {
        CourseOffering offering = offeringRepository.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần."));

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Bạn không có quyền lưu trữ Lớp học phần này.");
        }

        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ConflictException("COURSE_LOCKED",
                    "Không thể lưu trữ lớp đã bị khóa hoặc lưu trữ.");
        }

        offering.archive();
        return offeringRepository.save(offering);
    }

    /**
     * Retrieves all offerings belonging to a Teacher with optional filters.
     */
    @Transactional(readOnly = true)
    public List<CourseOffering> getTeacherOfferings(String teacherId, String semesterId, CourseOfferingStatus status) {
        if (semesterId != null && !semesterId.isBlank()) {
            return offeringRepository.findByTeacherIdAndSemesterId(teacherId, semesterId);
        }
        if (status != null) {
            return offeringRepository.findByTeacherIdAndStatus(teacherId, status);
        }
        return offeringRepository.findByTeacherId(teacherId);
    }

    /**
     * Retrieves a single offering by ID.
     */
    @Transactional(readOnly = true)
    public CourseOffering getOfferingById(String offeringId) {
        return offeringRepository.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần."));
    }
}
