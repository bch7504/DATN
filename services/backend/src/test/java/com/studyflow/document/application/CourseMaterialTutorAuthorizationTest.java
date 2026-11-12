package com.studyflow.document.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.document.domain.CourseMaterialType;
import com.studyflow.document.domain.CourseMaterialTutorSourceLink;
import com.studyflow.document.domain.CourseMaterialTutorSourceLinkRepository;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.integration.document.PresentationToPdfConverter;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.notification.application.port.NotificationStore;
import com.studyflow.publication.domain.DocumentPublication;
import com.studyflow.publication.domain.DocumentPublicationRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

class CourseMaterialTutorAuthorizationTest {
    private CourseMaterialDocumentRepository documents;
    private DocumentPublicationRepository publications;
    private CourseOfferingRepository offerings;
    private CourseEnrollmentRepository enrollments;
    private CourseMaterialTutorSourceLinkRepository tutorSourceLinks;
    private CourseMaterialLibraryService service;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        documents = mock(CourseMaterialDocumentRepository.class);
        publications = mock(DocumentPublicationRepository.class);
        offerings = mock(CourseOfferingRepository.class);
        enrollments = mock(CourseEnrollmentRepository.class);
        tutorSourceLinks = mock(CourseMaterialTutorSourceLinkRepository.class);
        ObjectProvider<AssignmentAttachmentStorage> storage = mock(ObjectProvider.class);
        ObjectProvider<PresentationToPdfConverter> converter = mock(ObjectProvider.class);
        service = new CourseMaterialLibraryService(
                documents,
                publications,
                tutorSourceLinks,
                offerings,
                enrollments,
                storage,
                converter,
                mock(TeacherResourceLibraryService.class),
                mock(NotificationStore.class),
                Clock.fixed(Instant.parse("2026-10-21T00:00:00Z"), ZoneOffset.UTC));
        when(tutorSourceLinks.findByCourseOfferingIdAndPrimaryDocumentIdOrderByCreatedAtAsc(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenReturn(List.of());
    }

    /** An approved Student may ask only through an active publication in an active class. */
    @Test
    void returnsMinimumTutorScopeForApprovedActivePublication() {
        UUID studentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        UUID offeringId = UUID.randomUUID();
        CourseMaterialDocument document = new CourseMaterialDocument(
                documentId, teacherId, "lesson.pdf", "Lesson", "private-key", 100, 9,
                Instant.parse("2026-10-21T00:00:00Z"));
        document.markReady(9, Instant.parse("2026-10-21T00:00:00Z"));
        DocumentPublication publication = new DocumentPublication(
                UUID.randomUUID(), documentId, offeringId, teacherId, Instant.parse("2026-10-21T00:00:00Z"));
        CourseEnrollment enrollment = new CourseEnrollment(UUID.randomUUID(), offeringId, studentId);
        enrollment.setStatus(EnrollmentStatus.APPROVED);
        CourseOffering offering = new CourseOffering(
                offeringId, UUID.randomUUID(), UUID.randomUUID(), teacherId,
                "DBI-01", "Cơ sở dữ liệu", "hash", "1234");
        when(documents.findByIdAndDeletedAtIsNull(documentId)).thenReturn(Optional.of(document));
        when(enrollments.findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED))
                .thenReturn(List.of(enrollment));
        when(publications.findByDocumentIdAndStatus(documentId, "PUBLISHED"))
                .thenReturn(List.of(publication));
        when(offerings.findById(offeringId)).thenReturn(Optional.of(offering));

        var scope = service.authorizeTutor(studentId, documentId, 4);

        assertEquals(documentId, scope.documentId());
        assertEquals(1, scope.documentVersion());
        assertEquals(offeringId, scope.courseOfferingId());
        assertEquals(9, scope.pageCount());
    }

    /** Linked READY support PDFs in the same published class extend only the Tutor scope. */
    @Test
    void includesPublishedSupportingPdfInTutorScope() {
        UUID studentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID slideId = UUID.randomUUID();
        UUID supportId = UUID.randomUUID();
        UUID offeringId = UUID.randomUUID();
        Instant now = Instant.parse("2026-10-21T00:00:00Z");
        CourseMaterialDocument slide = new CourseMaterialDocument(
                slideId, teacherId, "slide.pdf", "Slide", "slide-key", 100, 9, now);
        slide.markReady(9, now);
        CourseMaterialDocument support = new CourseMaterialDocument(
                supportId, teacherId, "book.pdf", "Giáo trình", "support-key", 200, 20,
                CourseMaterialType.SUPPORTING_PDF, now);
        support.markReady(20, now);
        DocumentPublication slidePublication = new DocumentPublication(
                UUID.randomUUID(), slideId, offeringId, teacherId, now);
        DocumentPublication supportPublication = new DocumentPublication(
                UUID.randomUUID(), supportId, offeringId, teacherId, now);
        CourseEnrollment enrollment = new CourseEnrollment(UUID.randomUUID(), offeringId, studentId);
        enrollment.setStatus(EnrollmentStatus.APPROVED);
        CourseOffering offering = new CourseOffering(
                offeringId, UUID.randomUUID(), UUID.randomUUID(), teacherId,
                "KTS-01", "Kỹ thuật số", "hash", "1234");
        when(documents.findByIdAndDeletedAtIsNull(slideId)).thenReturn(Optional.of(slide));
        when(documents.findByIdAndDeletedAtIsNull(supportId)).thenReturn(Optional.of(support));
        when(enrollments.findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED))
                .thenReturn(List.of(enrollment));
        when(publications.findByDocumentIdAndStatus(slideId, "PUBLISHED"))
                .thenReturn(List.of(slidePublication));
        when(publications.findByDocumentIdAndCourseOfferingId(supportId, offeringId))
                .thenReturn(Optional.of(supportPublication));
        when(offerings.findById(offeringId)).thenReturn(Optional.of(offering));
        when(tutorSourceLinks.findByCourseOfferingIdAndPrimaryDocumentIdOrderByCreatedAtAsc(
                offeringId, slideId)).thenReturn(List.of(new CourseMaterialTutorSourceLink(
                        UUID.randomUUID(), offeringId, slideId, supportId, teacherId, now)));

        var scope = service.authorizeTutor(studentId, slideId, 4);

        assertEquals(1, scope.supportSources().size());
        assertEquals(supportId, scope.supportSources().get(0).documentId());
        assertEquals("SUPPORTING", scope.supportSources().get(0).sourceRole());
    }

    /** Archived or locked classes must stop Tutor access immediately. */
    @Test
    void rejectsPublicationWhenCourseIsNotActive() {
        UUID studentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        UUID offeringId = UUID.randomUUID();
        CourseMaterialDocument document = new CourseMaterialDocument(
                documentId, teacherId, "lesson.pdf", "Lesson", "private-key", 100, 3,
                Instant.parse("2026-10-21T00:00:00Z"));
        document.markReady(3, Instant.parse("2026-10-21T00:00:00Z"));
        DocumentPublication publication = new DocumentPublication(
                UUID.randomUUID(), documentId, offeringId, teacherId, Instant.parse("2026-10-21T00:00:00Z"));
        CourseEnrollment enrollment = new CourseEnrollment(UUID.randomUUID(), offeringId, studentId);
        enrollment.setStatus(EnrollmentStatus.APPROVED);
        CourseOffering offering = new CourseOffering(
                offeringId, UUID.randomUUID(), UUID.randomUUID(), teacherId,
                "DBI-01", "Cơ sở dữ liệu", "hash", "1234");
        offering.setStatus(CourseOfferingStatus.ARCHIVED);
        when(documents.findByIdAndDeletedAtIsNull(documentId)).thenReturn(Optional.of(document));
        when(enrollments.findByStudentIdAndStatus(studentId, EnrollmentStatus.APPROVED))
                .thenReturn(List.of(enrollment));
        when(publications.findByDocumentIdAndStatus(documentId, "PUBLISHED"))
                .thenReturn(List.of(publication));
        when(offerings.findById(offeringId)).thenReturn(Optional.of(offering));

        ForbiddenException error = assertThrows(ForbiddenException.class,
                () -> service.authorizeTutor(studentId, documentId, 1));

        assertEquals("ENROLLMENT_REQUIRED", error.code());
    }

    /** Reference PDFs remain downloadable resources but can never authorize Tutor. */
    @Test
    void rejectsTutorForReferencePdfBeforeEnrollmentLookup() {
        UUID documentId = UUID.randomUUID();
        CourseMaterialDocument document = new CourseMaterialDocument(
                documentId,
                UUID.randomUUID(),
                "reference.pdf",
                "Reference",
                "private-key",
                100,
                3,
                CourseMaterialType.REFERENCE_PDF,
                Instant.parse("2026-10-21T00:00:00Z"));
        when(documents.findByIdAndDeletedAtIsNull(documentId)).thenReturn(Optional.of(document));

        ApiException error = assertThrows(ApiException.class,
                () -> service.authorizeTutor(UUID.randomUUID(), documentId, 1));

        assertEquals("MATERIAL_NOT_TUTORABLE", error.code());
    }
}
