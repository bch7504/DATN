package com.studyflow.courseoffering.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.studyflow.academic.domain.*;
import com.studyflow.academic.application.TeacherSubjectService;
import com.studyflow.admin.infrastructure.AdminJdbcStore;
import com.studyflow.common.exception.*;
import com.studyflow.courseoffering.domain.*;
import com.studyflow.courseoffering.dto.OpeningRequestModels.*;
import com.studyflow.courseoffering.infrastructure.OpeningRequestStore;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

/** Synthetic unit contracts: every test takes no args, returns void and fails on contract regression. */
class OpeningRequestServiceTest {
    private final UUID teacher=UUID.randomUUID(), admin=UUID.randomUUID(), id=UUID.randomUUID(), semesterId=UUID.randomUUID();
    private final UUID assignedId=UUID.randomUUID();
    private final TeacherSubjectService teacherSubjects=mock(TeacherSubjectService.class);
    private final Instant now=Instant.parse("2026-11-13T00:00:00Z");
    private final OpeningRequestStore store=mock(OpeningRequestStore.class);
    private final SemesterRepository semesters=mock(SemesterRepository.class);
    private final SubjectRepository subjects=mock(SubjectRepository.class);
    private final CourseOfferingService courses=mock(CourseOfferingService.class);
    private final CourseOfferingRepository courseRepository=mock(CourseOfferingRepository.class);
    private final AdminJdbcStore audit=mock(AdminJdbcStore.class);
    private final OpeningRequestService service=new OpeningRequestService(store,semesters,subjects,courses,courseRepository,audit,Clock.fixed(now,ZoneOffset.UTC),teacherSubjects);

    /** Args: status. Returns: synthetic projection with no user data. Errors: none. */
    private OpeningRequest request(String status) {
        return new OpeningRequest(id,teacher,"Synthetic teacher","NEW","New subject",3,semesterId,"Semester","NEW-01","New class",status,null,null,now,null);
    }
    /** Args: none. Output: mock open semester and pending locked request. Errors: none. */
    private void pending() {
        when(teacherSubjects.assigned(teacher)).thenReturn(new Subject(assignedId,"NEW","New subject",3,null,"ACTIVE"));
        when(store.find(id,true)).thenReturn(Optional.of(request("PENDING")));
        when(store.find(id,false)).thenReturn(Optional.of(request("APPROVED")));
        when(store.activeTeacher(teacher)).thenReturn(true);
        when(semesters.findById(semesterId)).thenReturn(Optional.of(new Semester(semesterId,"TEST","Semester","2026",LocalDate.of(2026,1,1),LocalDate.of(2026,12,31),SemesterStatus.ACTIVE,true)));
    }
    @Test void submissionCreatesOnlyPendingMetadata() {
        pending(); when(store.find(any(),eq(false))).thenReturn(Optional.of(request("PENDING")));
        var result=service.submit(teacher,new Submit(" new "," New subject ",3,semesterId," new-01 ",null));
        assertThat(result.status()).isEqualTo("PENDING"); assertThat(result.courseOfferingId()).isNull();
        verify(store).insert(any(),eq(teacher),argThat(input->input.subjectCode().equals("NEW") && input.code().equals("NEW-01")),eq(now));
        verifyNoInteractions(subjects,courses,courseRepository,audit);
    }
    @Test void invalidProposalAndPageAreRejected() {
        pending();
        assertThatThrownBy(()->service.submit(teacher,new Submit("BAD SPACE","Title",3,semesterId,"A",null))).isInstanceOf(ValidationException.class);
        assertThatThrownBy(()->service.list(teacher,null,-1,20)).isInstanceOf(ValidationException.class);
        assertThatThrownBy(()->service.list(null,"UNKNOWN",0,20)).isInstanceOf(ValidationException.class);
        verify(store,never()).insert(any(),any(),any(),any());
    }
    @Test void approvalKeepsAssignedSubjectAndCreatesOneTeacherOwnedCourse() {
        pending();
        var course=new CourseOffering(UUID.randomUUID(),assignedId,semesterId,teacher,"NEW-01","New class","synthetic-hash","0001");
        when(courses.createCourseOffering(eq(teacher),any())).thenReturn(new CreatedCourseOfferingResult(course,"not-exposed"));
        service.approve(admin,id,new Approve(assignedId,null,null,null),"req-test");
        verifyNoInteractions(subjects);
        verify(courseRepository).flush();
        verify(store).decide(id,admin,course.getId(),"APPROVED",null,now);
        verify(audit).audit(admin,"COURSE_OPENING_APPROVED","COURSE_OPENING_REQUEST",id,"SUCCESS","req-test",now);
    }
    @Test void reviewedRequestCannotCreateASecondCourse() {
        when(store.find(id,true)).thenReturn(Optional.of(request("APPROVED")));
        assertThatThrownBy(()->service.approve(admin,id,new Approve(null,null,null,null),"req")).isInstanceOf(ConflictException.class);
        verifyNoInteractions(courses,subjects);
    }
    @Test void inactiveTeacherAndClosedSemesterStopApproval() {
        pending(); when(store.activeTeacher(teacher)).thenReturn(false);
        assertThatThrownBy(()->service.approve(admin,id,new Approve(null,null,null,null),"req")).isInstanceOf(ConflictException.class);
        when(store.activeTeacher(teacher)).thenReturn(true);
        var semester=semesters.findById(semesterId).orElseThrow(); semester.setOfferingCreationEnabled(false);
        assertThatThrownBy(()->service.approve(admin,id,new Approve(null,null,null,null),"req")).isInstanceOf(ConflictException.class);
        verifyNoInteractions(courses,subjects);
    }
    @Test void otherSubjectCannotBeSubmittedOrApproved() {
        pending();
        assertThatThrownBy(()->service.submit(teacher,new Submit("OTHER","Other",3,semesterId,"OTHER-01",null))).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(()->service.approve(admin,id,new Approve(UUID.randomUUID(),null,null,null),"req")).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(subjects,courses);
    }
    @Test void rejectionRequiresReasonAndNeverCreatesCourse() {
        pending();
        assertThatThrownBy(()->service.reject(admin,id," ","req")).isInstanceOf(ValidationException.class);
        service.reject(admin,id,"More details required","req");
        verify(store).decide(id,admin,null,"REJECTED","More details required",now);
        verifyNoInteractions(courses,subjects);
    }
}
