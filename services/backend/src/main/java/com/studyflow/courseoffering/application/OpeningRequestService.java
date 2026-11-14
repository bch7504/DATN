package com.studyflow.courseoffering.application;

import com.studyflow.academic.domain.*;
import com.studyflow.academic.application.TeacherSubjectService;
import com.studyflow.admin.infrastructure.AdminJdbcStore;
import com.studyflow.common.exception.*;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.dto.OpeningRequestModels.*;
import com.studyflow.courseoffering.infrastructure.OpeningRequestStore;
import java.time.Clock;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Opening proposals stay separate from active courses until an Admin approves atomically. */
@Service
public class OpeningRequestService {
    private final OpeningRequestStore store;
    private final SemesterRepository semesters;
    private final SubjectRepository subjects;
    private final CourseOfferingService courses;
    private final CourseOfferingRepository courseRepository;
    private final AdminJdbcStore audit;
    private final Clock clock;
    private final TeacherSubjectService teacherSubjects;
    /** Args: app-only repositories/services and clock. Output: service. Errors: none. */
    public OpeningRequestService(OpeningRequestStore store, SemesterRepository semesters, SubjectRepository subjects,
            CourseOfferingService courses, CourseOfferingRepository courseRepository, AdminJdbcStore audit, Clock clock, TeacherSubjectService teacherSubjects) {
        this.store=store;this.semesters=semesters;this.subjects=subjects;this.courses=courses;
        this.courseRepository=courseRepository;this.audit=audit;this.clock=clock;this.teacherSubjects=teacherSubjects;
    }
    /** Args: authenticated Teacher and validated proposal for the assigned subject. Input: open semester.
     * Output: PENDING request, no Subject/course/join code. Errors: 404 semester, 409 closed/duplicate, 422 invalid fields. */
    @Transactional
    public OpeningRequest submit(UUID teacherId, Submit input) {
        requireSemester(input.semesterId());
        String subjectCode=code(input.subjectCode());
        String title=text(input.subjectName(),255);
        int credits=credits(input.credits());
        Subject assigned=teacherSubjects.assigned(teacherId);
        if (!assigned.getCode().equalsIgnoreCase(subjectCode) || !assigned.getName().equalsIgnoreCase(title) || assigned.getCredits()!=credits)
            throw TeacherSubjectService.mismatch();
        String classCode=code(input.code());
        Submit normalized=new Submit(subjectCode,title,credits,input.semesterId(),classCode,
                input.name()==null || input.name().isBlank() ? title : text(input.name(),255));
        UUID id=UUID.randomUUID();
        try { store.insert(id,teacherId,normalized,clock.instant()); }
        catch(DataIntegrityViolationException exception) { throw new ConflictException("DUPLICATE_OPENING_REQUEST","Đã có yêu cầu chờ duyệt cho mã lớp này trong học kỳ."); }
        return store.find(id,false).orElseThrow();
    }
    /** Args: optional Teacher scope/status, page>=0, size 1..100. Output: safe page.
     * Errors: 422 invalid pagination/filter; controller restricts Admin versus Teacher scope. */
    @Transactional(readOnly=true)
    public Page list(UUID teacherId,String status,int page,int size) {
        if(page<0 || size<1 || size>100) throw new ValidationException("INVALID_PAGE","Trang hoặc kích thước trang không hợp lệ.");
        if(status!=null && !Set.of("PENDING","APPROVED","REJECTED").contains(status)) throw new ValidationException("INVALID_FILTER","Trạng thái không hợp lệ.");
        return store.list(teacherId,status,page,size);
    }
    /** Args: Admin identity, request ID, canonical Subject selection/fields, trace ID.
     * Input: locked PENDING request, active Teacher, open semester and assigned ACTIVE canonical subject.
     * Output: APPROVED request with new course ID; never creates or switches the assigned subject; atomically inserts
     * one Teacher-owned course and audit. Errors: 404 missing, 409 reviewed/catalog conflict/unavailable, 422 invalid fields. */
    @Transactional
    public OpeningRequest approve(UUID adminId,UUID id,Approve input,String traceId) {
        OpeningRequest request=pending(id);
        if(!store.activeTeacher(request.teacherId())) throw new ConflictException("TEACHER_NOT_ACTIVE","Giảng viên không còn hoạt động.");
        requireSemester(request.semesterId());
        Subject subject=teacherSubjects.assigned(request.teacherId());
        if ((input.subjectId()!=null && !input.subjectId().equals(subject.getId()))
                || (input.subjectCode()!=null && !subject.getCode().equalsIgnoreCase(input.subjectCode().strip()))
                || (input.subjectName()!=null && !subject.getName().equalsIgnoreCase(input.subjectName().strip()))
                || (input.credits()!=null && input.credits()!=subject.getCredits())) throw TeacherSubjectService.mismatch();
        if (!subject.getCode().equalsIgnoreCase(request.subjectCode())) throw TeacherSubjectService.mismatch();
        CreatedCourseOfferingResult created;
        try {
            created=courses.createCourseOffering(request.teacherId(),new CreateCourseOfferingCommand(subject.getId(),request.semesterId(),request.code(),request.name()));
            courseRepository.flush();
        } catch(DataIntegrityViolationException exception) { throw new ConflictException("COURSE_CODE_EXISTS","Mã lớp vừa được sử dụng. Hãy từ chối yêu cầu và đề nghị mã lớp khác."); }
        store.decide(id,adminId,created.offering().getId(),"APPROVED",null,clock.instant());
        audit.audit(adminId,"COURSE_OPENING_APPROVED","COURSE_OPENING_REQUEST",id,"SUCCESS",traceId,clock.instant());
        return store.find(id,false).orElseThrow();
    }
    /** Args: Admin, PENDING request ID, nonblank reason<=1000, trace. Output: REJECTED metadata/audit,
     * no class/Subject created. Errors: 404 missing, 409 already decided, 422 invalid reason. */
    @Transactional
    public OpeningRequest reject(UUID adminId,UUID id,String reason,String traceId) {
        pending(id);
        store.decide(id,adminId,null,"REJECTED",text(reason,1000),clock.instant());
        audit.audit(adminId,"COURSE_OPENING_REJECTED","COURSE_OPENING_REQUEST",id,"SUCCESS",traceId,clock.instant());
        return store.find(id,false).orElseThrow();
    }
    /** Args: request UUID. Returns: locked pending request. Errors: 404/409. */
    private OpeningRequest pending(UUID id) {
        OpeningRequest row=store.find(id,true).orElseThrow(()->new ResourceNotFoundException("OPENING_REQUEST_NOT_FOUND","Không tìm thấy yêu cầu mở lớp."));
        if(!"PENDING".equals(row.status())) throw new ConflictException("OPENING_REQUEST_ALREADY_REVIEWED","Yêu cầu đã được xử lý.");
        return row;
    }
    /** Args: semester UUID. Output: void. Errors: 404 missing, 409 no longer open. */
    private void requireSemester(UUID id) {
        if(id==null) throw new ValidationException("INVALID_OPENING_REQUEST","Hãy chọn học kỳ.");
        if(!semesters.findById(id).orElseThrow(()->new ResourceNotFoundException("SEMESTER_NOT_FOUND","Không tìm thấy học kỳ.")).canCreateCourseOffering())
            throw new ConflictException("SEMESTER_NOT_ACTIVE","Học kỳ không cho phép mở lớp.");
    }
    /** Args: proposed code. Returns: uppercase ASCII code<=50. Errors: 422 invalid. */
    private static String code(String value) {
        String normalized=text(value,50).toUpperCase(Locale.ROOT);
        if(!normalized.matches("[A-Z0-9][A-Z0-9._-]*")) throw new ValidationException("INVALID_OPENING_REQUEST","Mã chỉ chứa chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.");
        return normalized;
    }
    /** Args: required text/max length. Returns: trimmed text. Errors: 422 invalid. */
    private static String text(String value,int max) {
        if(value==null || value.isBlank() || value.strip().length()>max) throw new ValidationException("INVALID_OPENING_REQUEST","Thiếu thông tin hoặc nội dung vượt độ dài cho phép.");
        return value.strip();
    }
    /** Args: required credit count. Returns: 1..30. Errors: 422 invalid. */
    private static int credits(Integer value) {
        if(value==null || value<1 || value>30) throw new ValidationException("INVALID_OPENING_REQUEST","Tín chỉ phải từ 1 đến 30.");
        return value;
    }
}
