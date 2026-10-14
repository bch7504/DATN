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

    @Transactional
    public CreatedCourseOfferingResult createCourseOffering(UUID teacherId, CreateCourseOfferingCommand cmd) {
        Subject subject = subjectRepository.findById(cmd.subjectId())
                .orElseThrow(() -> new ResourceNotFoundException("SUBJECT_NOT_FOUND", "Không tìm thấy Môn học được chỉ định."));

        Semester semester = semesterRepository.findById(cmd.semesterId())
                .orElseThrow(() -> new ResourceNotFoundException("SEMESTER_NOT_FOUND", "Không tìm thấy Học kỳ được chỉ định."));

        if (!semester.canCreateCourseOffering()) {
            throw new ConflictException("SEMESTER_NOT_ACTIVE", "Học kỳ này hiện không mở cho phép tạo Lớp học phần mới.");
        }

        String offeringCode = cmd.code();
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

        String offeringName = cmd.name();
        if (offeringName == null || offeringName.isBlank()) {
            offeringName = subject.getName() + " (" + offeringCode + ")";
        } else {
            offeringName = offeringName.trim();
        }

        String rawJoinCode = JoinCodeUtils.generateRandomCode(subject.getCode(), 6);
        String joinCodeHash = JoinCodeUtils.sha256Hex(rawJoinCode);
        String joinCodeHint = JoinCodeUtils.extractHint(rawJoinCode);

        CourseOffering offering = new CourseOffering(
                UUID.randomUUID(),
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

    @Transactional
    public CourseOffering updateCourseOffering(UUID teacherId, UUID offeringId,
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

    @Transactional
    public String regenerateJoinCode(UUID teacherId, UUID offeringId) {
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

    @Transactional
    public CourseOffering toggleJoinCode(UUID teacherId, UUID offeringId, boolean enabled) {
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

    @Transactional
    public CourseOffering archiveOffering(UUID teacherId, UUID offeringId) {
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

    @Transactional(readOnly = true)
    public List<CourseOffering> getTeacherOfferings(UUID teacherId, UUID semesterId, CourseOfferingStatus status) {
        if (semesterId != null) {
            return offeringRepository.findByTeacherIdAndSemesterId(teacherId, semesterId);
        }
        if (status != null) {
            return offeringRepository.findByTeacherIdAndStatus(teacherId, status);
        }
        return offeringRepository.findByTeacherId(teacherId);
    }

    @Transactional(readOnly = true)
    public CourseOffering getOfferingById(UUID offeringId) {
        return offeringRepository.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần."));
    }
}
