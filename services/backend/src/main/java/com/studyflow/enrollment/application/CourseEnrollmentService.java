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
import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.notification.domain.NotificationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CourseEnrollmentService {

    private final CourseEnrollmentRepository enrollmentRepository;
    private final CourseOfferingRepository offeringRepository;
    private final NotificationStore notifications;

    /** Args: enrollment/offering repositories and notification store. Input: Spring adapters. Output: service; errors: missing beans prevent startup. */
    public CourseEnrollmentService(CourseEnrollmentRepository enrollmentRepository,
                                  CourseOfferingRepository offeringRepository, NotificationStore notifications) {
        this.enrollmentRepository = enrollmentRepository;
        this.offeringRepository = offeringRepository;
        this.notifications = notifications;
    }

    /** Args: Student ID and join code. Input: active join-enabled class. Output: pending enrollment; errors: 404/409/422. Side effect: one teacher notice on a new request. */
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
                CourseEnrollment reapplied = enrollmentRepository.save(existing);
                notifications.createTeacherEnrollmentRequestedIfAbsent(offering.getTeacherId(), reapplied.getId(),
                        offering.getName(), reapplied.getRequestedAt());
                notifyStudent(reapplied, offering, NotificationType.STUDENT_ENROLLMENT_REQUESTED,
                        "Đã gửi yêu cầu tham gia", "Yêu cầu vào lớp “" + offering.getName() + "” đang chờ giảng viên duyệt.",
                        reapplied.getRequestedAt());
                return reapplied;
            }
        }

        CourseEnrollment newEnrollment = new CourseEnrollment(UUID.randomUUID(), offering.getId(), studentId);
        CourseEnrollment created = enrollmentRepository.save(newEnrollment);
        notifications.createTeacherEnrollmentRequestedIfAbsent(offering.getTeacherId(), created.getId(),
                offering.getName(), created.getRequestedAt());
        notifyStudent(created, offering, NotificationType.STUDENT_ENROLLMENT_REQUESTED,
                "Đã gửi yêu cầu tham gia", "Yêu cầu vào lớp “" + offering.getName() + "” đang chờ giảng viên duyệt.",
                created.getRequestedAt());
        return created;
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
        CourseEnrollment approved = enrollmentRepository.save(enrollment);
        notifyStudent(approved, offering, NotificationType.STUDENT_ENROLLMENT_APPROVED,
                "Đã được duyệt vào lớp", "Bạn đã được duyệt vào lớp “" + offering.getName() + "”.",
                approved.getDecidedAt());
        return approved;
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
        List<CourseEnrollment> approved = enrollmentRepository.saveAll(enrollments);
        for (CourseEnrollment enrollment : approved) {
            notifyStudent(enrollment, offering, NotificationType.STUDENT_ENROLLMENT_APPROVED,
                    "Đã được duyệt vào lớp", "Bạn đã được duyệt vào lớp “" + offering.getName() + "”.",
                    enrollment.getDecidedAt());
        }
        return approved;
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
        CourseEnrollment rejected = enrollmentRepository.save(enrollment);
        notifyStudent(rejected, offering, NotificationType.STUDENT_ENROLLMENT_REJECTED,
                "Yêu cầu tham gia bị từ chối", "Yêu cầu vào lớp “" + offering.getName() + "” chưa được duyệt.",
                rejected.getDecidedAt());
        return rejected;
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
        CourseEnrollment removed = enrollmentRepository.save(enrollment);
        notifyStudent(removed, offering, NotificationType.STUDENT_ENROLLMENT_REMOVED,
                "Đã rời khỏi lớp", "Bạn không còn là thành viên lớp “" + offering.getName() + "”.",
                removed.getRemovedAt());
        return removed;
    }

    /** Args: validated enrollment/offering, event type, bounded text and event instant. Input: current transaction. Output: void; adds one Student notice/email. Errors: persistence failure rolls back the decision. */
    private void notifyStudent(CourseEnrollment enrollment, CourseOffering offering, NotificationType type,
                               String title, String message, Instant occurredAt) {
        UUID eventId = UUID.nameUUIDFromBytes((enrollment.getId() + ":" + type + ":" + occurredAt)
                .getBytes(StandardCharsets.UTF_8));
        notifications.createEventIfAbsent(enrollment.getStudentId(), type, title, message,
                "COURSE_ENROLLMENT", eventId, null, occurredAt, true);
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
