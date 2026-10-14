package com.studyflow.enrollment.application;

import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.common.util.JoinCodeUtils;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CourseEnrollmentService {

    private final CourseEnrollmentRepository enrollmentRepository;
    private final CourseOfferingRepository offeringRepository;

    public CourseEnrollmentService(CourseEnrollmentRepository enrollmentRepository,
                                  CourseOfferingRepository offeringRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.offeringRepository = offeringRepository;
    }

    @Transactional
    public CourseEnrollment joinByCode(UUID studentId, String rawJoinCode) {
        String cleanCode = JoinCodeUtils.normalize(rawJoinCode);
        if (cleanCode.isBlank()) {
            throw new ValidationException("INVALID_JOIN_CODE", "Mã tham gia lớp không được để trống.");
        }

        String hash = JoinCodeUtils.sha256Hex(cleanCode);
        CourseOffering offering = offeringRepository.findByJoinCodeHash(hash)
                .orElseThrow(() -> new ResourceNotFoundException("JOIN_CODE_NOT_FOUND", "Không tìm thấy Lớp học phần với mã tham gia này."));

        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ConflictException("COURSE_NOT_JOINABLE", "Lớp học phần này đã bị khóa hoặc kết thúc lưu trữ.");
        }

        if (!offering.isJoinEnabled()) {
            throw new ConflictException("JOIN_DISABLED", "Mã tham gia lớp này đã bị vô hiệu hóa bởi giảng viên.");
        }

        Optional<CourseEnrollment> existingOpt = enrollmentRepository
                .findByCourseOfferingIdAndStudentId(offering.getId(), studentId);

        if (existingOpt.isPresent()) {
            CourseEnrollment existing = existingOpt.get();
            if (existing.getStatus() == EnrollmentStatus.APPROVED) {
                throw new ConflictException("ENROLLMENT_ALREADY_APPROVED", "Bạn đã được duyệt vào lớp học phần này từ trước.");
            }
            if (existing.getStatus() == EnrollmentStatus.PENDING) {
                return existing;
            }
            if (existing.getStatus() == EnrollmentStatus.REJECTED || existing.getStatus() == EnrollmentStatus.REMOVED) {
                existing.reapply();
                return enrollmentRepository.save(existing);
            }
        }

        CourseEnrollment newEnrollment = new CourseEnrollment(UUID.randomUUID(), offering.getId(), studentId);
        return enrollmentRepository.save(newEnrollment);
    }

    @Transactional
    public CourseEnrollment approveEnrollment(UUID teacherId, UUID enrollmentId) {
        CourseEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("ENROLLMENT_NOT_FOUND", "Không tìm thấy yêu cầu ghi danh."));

        CourseOffering offering = offeringRepository.findById(enrollment.getCourseOfferingId())
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần tương ứng."));

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Chỉ giảng viên chủ nhiệm mới có quyền duyệt sinh viên vào lớp này.");
        }

        if (enrollment.getStatus() == EnrollmentStatus.APPROVED) {
            return enrollment;
        }

        enrollment.approve(teacherId);
        return enrollmentRepository.save(enrollment);
    }

    @Transactional
    public List<CourseEnrollment> approveBatch(UUID teacherId, UUID offeringId, List<UUID> enrollmentIds) {
        if (enrollmentIds == null || enrollmentIds.isEmpty()) {
            throw new ValidationException("INVALID_ENROLLMENT_BATCH",
                    "Danh sách yêu cầu ghi danh không được rỗng.");
        }

        CourseOffering offering = offeringRepository.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần tương ứng."));

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Chỉ giảng viên chủ nhiệm mới có quyền duyệt sinh viên vào lớp này.");
        }

        List<UUID> distinctIds = enrollmentIds.stream().distinct().collect(Collectors.toList());
        List<CourseEnrollment> enrollments = enrollmentRepository.findAllById(distinctIds);
        if (enrollments.size() != distinctIds.size()) {
            throw new ValidationException("INVALID_ENROLLMENT_BATCH",
                    "Danh sách có yêu cầu ghi danh không tồn tại.");
        }

        for (CourseEnrollment enrollment : enrollments) {
            if (!offeringId.equals(enrollment.getCourseOfferingId())) {
                throw new ValidationException("INVALID_ENROLLMENT_BATCH", "Yêu cầu ghi danh không thuộc lớp học phần được chọn.");
            }
            if (enrollment.getStatus() != EnrollmentStatus.PENDING) {
                throw new ValidationException("INVALID_ENROLLMENT_BATCH",
                        "Chỉ có thể duyệt các yêu cầu đang ở trạng thái PENDING.");
            }
        }

        enrollments.forEach(enrollment -> enrollment.approve(teacherId));
        return enrollmentRepository.saveAll(enrollments);
    }

    @Transactional
    public CourseEnrollment rejectEnrollment(UUID teacherId, UUID enrollmentId, String reason) {
        CourseEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("ENROLLMENT_NOT_FOUND", "Không tìm thấy yêu cầu ghi danh."));

        CourseOffering offering = offeringRepository.findById(enrollment.getCourseOfferingId())
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần tương ứng."));

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Chỉ giảng viên chủ nhiệm mới có quyền từ chối yêu cầu này.");
        }

        enrollment.reject(teacherId, reason);
        return enrollmentRepository.save(enrollment);
    }

    @Transactional
    public CourseEnrollment removeStudent(UUID teacherId, UUID enrollmentId, String reason) {
        CourseEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("ENROLLMENT_NOT_FOUND", "Không tìm thấy yêu cầu ghi danh."));

        CourseOffering offering = offeringRepository.findById(enrollment.getCourseOfferingId())
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần tương ứng."));

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Chỉ giảng viên chủ nhiệm mới có quyền quản lý thành viên lớp này.");
        }

        enrollment.remove(teacherId, reason);
        return enrollmentRepository.save(enrollment);
    }

    @Transactional(readOnly = true)
    public List<CourseEnrollment> getTeacherEnrollments(UUID teacherId, UUID offeringId, EnrollmentStatus status) {
        CourseOffering offering = offeringRepository.findById(offeringId)
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy Lớp học phần."));

        if (!offering.isOwnedBy(teacherId)) {
            throw new ForbiddenException("FORBIDDEN", "Bạn không có quyền xem danh sách sinh viên của lớp này.");
        }

        if (status != null) {
            return enrollmentRepository.findByCourseOfferingIdAndStatus(offeringId, status);
        }
        return enrollmentRepository.findByCourseOfferingId(offeringId);
    }

    @Transactional(readOnly = true)
    public List<CourseEnrollment> getStudentEnrollments(UUID studentId, EnrollmentStatus status) {
        if (status != null) {
            return enrollmentRepository.findByStudentIdAndStatus(studentId, status);
        }
        return enrollmentRepository.findByStudentId(studentId);
    }

    @Transactional(readOnly = true)
    public List<CourseEnrollment> getStudentEnrollments(UUID studentId, UUID semesterId,
                                                         EnrollmentStatus status) {
        if (semesterId == null) {
            return getStudentEnrollments(studentId, status);
        }

        List<UUID> offeringIds = offeringRepository.findBySemesterId(semesterId).stream()
                .map(CourseOffering::getId)
                .collect(Collectors.toList());
        if (offeringIds.isEmpty()) {
            return List.of();
        }
        if (status != null) {
            return enrollmentRepository.findByStudentIdAndStatusAndCourseOfferingIdIn(
                    studentId, status, offeringIds);
        }
        return enrollmentRepository.findByStudentIdAndCourseOfferingIdIn(studentId, offeringIds);
    }

    @Transactional(readOnly = true)
    public List<CourseOffering> getStudentApprovedOfferings(UUID studentId) {
        List<CourseEnrollment> approvedEnrollments = enrollmentRepository
                .findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED);

        List<UUID> offeringIds = approvedEnrollments.stream()
                .map(CourseEnrollment::getCourseOfferingId)
                .collect(Collectors.toList());

        return offeringRepository.findAllById(offeringIds);
    }

    @Transactional(readOnly = true)
    public boolean isStudentApproved(UUID studentId, UUID offeringId) {
        return enrollmentRepository.findByCourseOfferingIdAndStudentId(offeringId, studentId)
                .map(CourseEnrollment::isApproved)
                .orElse(false);
    }
}
