package com.studyflow.document.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.enrollment.domain.CourseEnrollment;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.integration.storage.AssignmentAttachmentStorage;
import com.studyflow.publication.domain.DocumentPublication;
import com.studyflow.publication.domain.DocumentPublicationRepository;
import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

/**
 * Synthetic authorization regression tests. Test methods take no args and return void;
 * fixtures are isolated in-memory repositories/storage. Failed expectations raise assertion errors.
 */
class CourseMaterialAccessTest {
    private final UUID teacher = UUID.randomUUID();
    private final UUID student = UUID.randomUUID();
    private final Instant now = Instant.parse("2026-10-15T00:00:00Z");
    private final CourseMaterialDocumentRepository documents = mock(CourseMaterialDocumentRepository.class);
    private final DocumentPublicationRepository publications = mock(DocumentPublicationRepository.class);
    private final CourseOfferingRepository offerings = mock(CourseOfferingRepository.class);
    private final CourseEnrollmentRepository enrollments = mock(CourseEnrollmentRepository.class);
    private final AssignmentAttachmentStorage storage = mock(AssignmentAttachmentStorage.class);
    private CourseMaterialLibraryService service;
    private CourseMaterialDocument document;
    private CourseOffering offering;
    private DocumentPublication publication;

    /** No args; creates owner/class/document fixtures, output void, no external I/O. */
    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ObjectProvider<AssignmentAttachmentStorage> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(storage);
        service = new CourseMaterialLibraryService(documents, publications, offerings, enrollments,
                provider, Clock.fixed(now, ZoneOffset.UTC));
        document = new CourseMaterialDocument(UUID.randomUUID(), teacher, "lesson.pdf", "Lesson",
                "synthetic-key", 8, 1, now);
        offering = new CourseOffering(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), teacher,
                "TEST-01", "Synthetic course", "synthetic-hash", "0001");
        publication = new DocumentPublication(UUID.randomUUID(), document.getId(), offering.getId(), teacher,
                now.minusSeconds(3600));
        when(documents.findByIdAndDeletedAtIsNull(document.getId())).thenReturn(Optional.of(document));
        when(offerings.findById(offering.getId())).thenReturn(Optional.of(offering));
        when(publications.findByDocumentIdAndCourseOfferingId(document.getId(), offering.getId()))
                .thenReturn(Optional.of(publication));
        when(publications.findByDocumentIdAndStatus(document.getId(), "PUBLISHED"))
                .thenAnswer(invocation -> "PUBLISHED".equals(publication.getStatus()) ? List.of(publication) : List.of());
        when(publications.findByCourseOfferingIdAndStatus(offering.getId(), "PUBLISHED"))
                .thenAnswer(invocation -> "PUBLISHED".equals(publication.getStatus()) ? List.of(publication) : List.of());
    }

    @Test
    void otherTeacherCannotDownloadPublishOrRevoke() {
        UUID otherTeacher = UUID.randomUUID();
        assertThatThrownBy(() -> service.downloadForTeacher(otherTeacher, document.getId())).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.setPublications(otherTeacher, document.getId(), List.of(offering.getId())))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.revokePublication(otherTeacher, document.getId(), offering.getId()))
                .isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(storage);
        verify(publications, never()).save(any());
    }

    @Test
    void validatesEveryClassBeforeChangingAnyPublication() {
        CourseOffering foreignOffering = new CourseOffering(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), "FOREIGN", "Foreign class", "foreign-hash", "0002");
        when(offerings.findById(foreignOffering.getId())).thenReturn(Optional.of(foreignOffering));
        publication.revoke(now.minusSeconds(60));

        assertThatThrownBy(() -> service.setPublications(teacher, document.getId(),
                List.of(offering.getId(), foreignOffering.getId()))).isInstanceOf(ForbiddenException.class);

        assertThat(publication.getStatus()).isEqualTo("REVOKED");
        verify(publications, never()).save(any());
    }

    @Test
    void rejectsInactiveClassAndDuplicateSelection() {
        offering.archive();
        assertThatThrownBy(() -> service.setPublications(teacher, document.getId(), List.of(offering.getId())))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("COURSE_NOT_ACTIVE");
        assertThatThrownBy(() -> service.setPublications(teacher, document.getId(), List.of(offering.getId(), offering.getId())))
                .isInstanceOf(ValidationException.class);
        verify(publications, never()).save(any());
    }

    @Test
    void nullSelectionCannotAccidentallyRevokeAllClasses() {
        assertThatThrownBy(() -> service.setPublications(teacher, document.getId(), null))
                .isInstanceOf(ValidationException.class);
        assertThat(publication.getStatus()).isEqualTo("PUBLISHED");
        verify(publications, never()).save(any());
    }

    @Test
    void repeatedSelectionPreservesPublicationTimeButRepublishUpdatesIt() {
        Instant original = publication.getPublishedAt();
        service.setPublications(teacher, document.getId(), List.of(offering.getId()));
        assertThat(publication.getPublishedAt()).isEqualTo(original);

        service.revokePublication(teacher, document.getId(), offering.getId());
        service.setPublications(teacher, document.getId(), List.of(offering.getId()));
        assertThat(publication.getStatus()).isEqualTo("PUBLISHED");
        assertThat(publication.getPublishedAt()).isEqualTo(now);
    }

    @Test
    void approvedStudentDownloadsUntilPublicationIsRevoked() throws Exception {
        approveStudent();
        when(storage.get("synthetic-key")).thenReturn(new ByteArrayInputStream(new byte[8]));
        var file = service.downloadForStudent(student, document.getId());
        try (var content = file.content()) {
            assertThat(file.fileName()).isEqualTo("lesson.pdf");
            assertThat(file.contentType()).isEqualTo("application/pdf");
            assertThat(content.readAllBytes()).hasSize((int) file.sizeBytes());
        }

        service.revokePublication(teacher, document.getId(), offering.getId());
        assertThatThrownBy(() -> service.downloadForStudent(student, document.getId())).isInstanceOf(ForbiddenException.class);
        assertThat(service.listStudent(student, offering.getId())).isEmpty();
        verify(storage, times(1)).get(any());
    }

    @Test
    void approvedStudentCannotAccessLockedClass() {
        approveStudent();
        offering.lock();
        assertThat(service.listStudent(student, offering.getId())).isEmpty();
        assertThatThrownBy(() -> service.downloadForStudent(student, document.getId())).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void missingApprovedEnrollmentDeniesListAndDownload() {
        when(enrollments.findByStudentIdAndStatus(student, EnrollmentStatus.APPROVED)).thenReturn(List.of());
        assertThat(service.listStudent(student, null)).isEmpty();
        assertThatThrownBy(() -> service.listStudent(student, offering.getId())).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.downloadForStudent(student, document.getId())).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void studentMetadataContainsOnlyTheirApprovedClasses() {
        approveStudent();
        var result = service.listStudent(student, null);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(document.getId());
        assertThat(result.get(0).publishedOfferings()).hasSize(1);
        assertThat(result.get(0).publishedOfferings().get(0).offeringId()).isEqualTo(offering.getId());
        verifyNoInteractions(storage);
    }

    @Test
    void emptySelectionRevokesPublicationAndDeniesFurtherDownload() {
        approveStudent();
        service.setPublications(teacher, document.getId(), List.of());
        assertThat(publication.getStatus()).isEqualTo("REVOKED");
        assertThatThrownBy(() -> service.downloadForStudent(student, document.getId())).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(storage);
    }

    /** No args; installs a synthetic APPROVED enrollment fixture; output void, no external effects/errors. */
    private void approveStudent() {
        CourseEnrollment enrollment = new CourseEnrollment(UUID.randomUUID(), offering.getId(), student);
        enrollment.approve(teacher);
        when(enrollments.findByStudentIdAndStatus(student, EnrollmentStatus.APPROVED)).thenReturn(List.of(enrollment));
    }
}
