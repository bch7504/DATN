package com.studyflow.academic.application;

import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ForbiddenException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Shared subject boundary for Teacher account, proposal and approved class creation. */
@Service
public class TeacherSubjectService {
    private final JdbcTemplate jdbc;
    private final SubjectRepository subjects;
    /** Args: app JDBC and subject repository. Output: policy service; errors: none. */
    public TeacherSubjectService(JdbcTemplate jdbc,SubjectRepository subjects) { this.jdbc=jdbc;this.subjects=subjects; }
    /** Args: authenticated Teacher UUID. Input: ACTIVE Teacher with one assigned ACTIVE subject.
     * Output: canonical Subject; errors: 409 TEACHER_SUBJECT_NOT_ASSIGNED/SUBJECT_INACTIVE, database failure. */
    @Transactional(readOnly=true)
    public Subject assigned(UUID teacherId) {
        UUID id=jdbc.query("SELECT teacher_subject_id FROM app.users WHERE id=? AND role='TEACHER' AND status='ACTIVE'",
                (rs,row)->(UUID)rs.getObject(1),teacherId).stream().filter(java.util.Objects::nonNull).findFirst().orElseThrow(
                ()->new ConflictException("TEACHER_SUBJECT_NOT_ASSIGNED","Tài khoản chưa được phân công môn học. Vui lòng liên hệ Admin."));
        Subject subject=subjects.findById(id).orElseThrow(()->new ConflictException("TEACHER_SUBJECT_NOT_ASSIGNED","Không tìm thấy môn được phân công."));
        if(!"ACTIVE".equals(subject.getStatus())) throw new ConflictException("SUBJECT_INACTIVE","Môn phụ trách không còn hoạt động.");
        return subject;
    }
    /** Args: Teacher UUID and requested subject UUID. Output: void if identical; errors: 403 mismatch or assignment errors. */
    public void require(UUID teacherId,UUID subjectId) {
        if(!assigned(teacherId).getId().equals(subjectId)) throw mismatch();
    }
    /** Args: none. Output: safe 403 business error; errors: none. */
    public static ForbiddenException mismatch() {
        return new ForbiddenException("TEACHER_SUBJECT_MISMATCH","Giảng viên chỉ được mở lớp cho môn đã được phân công.");
    }
}
