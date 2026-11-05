package com.studyflow.review.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyflow.common.exception.ApiException;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.integration.ai.AiContracts;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.review.api.QuizApiModels;
import com.studyflow.review.domain.QuizDraftData;
import com.studyflow.review.domain.QuizDraftStore;
import com.studyflow.review.domain.QuizQuestionRepository;
import com.studyflow.review.domain.QuizQuestionSourceRepository;
import com.studyflow.review.domain.QuizRepository;
import com.studyflow.review.domain.QuizSourceRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

/** Java boundary tests ensure untrusted AI Quiz output cannot bypass the MCQ or citation contract. */
class AiQuizServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-22T00:00:00Z");

    private final CourseMaterialDocumentRepository documents = mock(CourseMaterialDocumentRepository.class);
    private final QuizDraftStore drafts = mock(QuizDraftStore.class);
    private final CourseEnrollmentRepository enrollments = mock(CourseEnrollmentRepository.class);
    private final CourseOfferingRepository offerings = mock(CourseOfferingRepository.class);
    private final AiServiceClient ai = mock(AiServiceClient.class);
    private final QuizImageMaterializer imageMaterializer = mock(QuizImageMaterializer.class);
    private final QuizRepository quizzes = mock(QuizRepository.class);
    private final QuizQuestionRepository quizQuestions = mock(QuizQuestionRepository.class);
    private final QuizQuestionSourceRepository quizQuestionSources = mock(QuizQuestionSourceRepository.class);
    private final QuizSourceRepository quizSources = mock(QuizSourceRepository.class);
    private AiQuizService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ObjectProvider<AiServiceClient> aiProvider = mock(ObjectProvider.class);
        when(aiProvider.getIfAvailable()).thenReturn(ai);
        when(drafts.save(any(QuizDraftData.class))).thenAnswer(invocation -> invocation.getArgument(0));
        service = new AiQuizService(
                documents,
                drafts,
                enrollments,
                offerings,
                aiProvider,
                imageMaterializer,
                quizzes,
                quizQuestions,
                quizQuestionSources,
                quizSources,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    /** A grounded four-option MCQ with the requested count becomes a Java-owned review draft. */
    @Test
    void acceptsValidStudentQuizDraft() {
        UUID studentId = UUID.randomUUID();
        CourseMaterialDocument document = readyPersonal(studentId, 5);
        authorize(document, studentId, "PERSONAL");
        when(ai.generateQuiz(any(), anyString(), anyString())).thenReturn(generated(document, 2, fourOptions()));

        QuizApiModels.Draft result = service.createStudent(
                studentId, List.of(document.getId()), "Create 1 question hard", "request-1", "key-1");

        assertThat(result.status()).isEqualTo("REVIEW_REQUIRED");
        assertThat(result.questions()).hasSize(1);
        assertThat(result.questions().get(0).options()).hasSize(4);
        assertThat(result.questions().get(0).correctOptionId()).isEqualTo("B");
    }

    /** Imported text is stored without PDF sources or citations and remains review-required. */
    @Test
    void acceptsImportedTextQuizWithoutFakeCitation() {
        UUID studentId = UUID.randomUUID();
        CourseMaterialDocument selectedConversationDocument = readyPersonal(studentId, 5);
        var question = new AiContracts.QuizQuestionDraft(
                "2 + 2 equals?", fourOptions(), 1, "The supplied text marks option B.", List.of());
        var quiz = new AiContracts.QuizDraft(
                "MCQ_SINGLE", AiContracts.QuizDraftSource.IMPORTED_TEXT,
                "Imported Quiz", List.of(question));

        QuizDraftData result = service.saveAssistantQuiz(
                studentId, "Import the pasted questions", List.of(selectedConversationDocument), quiz);

        assertThat(result.status()).isEqualTo("REVIEW_REQUIRED");
        assertThat(result.mode()).isEqualTo("IMPORTED_TEXT_STUDENT");
        assertThat(result.sourceDocumentIds()).isEmpty();
        assertThat(result.questions().get(0).citations()).isEmpty();
    }

    /** A cited in-scope visual reference is materialized by Java and exposed only by opaque image ID. */
    @Test
    void materializesAuthorizedQuizImage() {
        UUID studentId = UUID.randomUUID();
        CourseMaterialDocument document = readyPersonal(studentId, 5);
        authorize(document, studentId, "PERSONAL");
        var citation = new AiContracts.Citation(
                document.getId(), document.getDocumentVersion(), 2, "[Sơ đồ/Hình ảnh trang 2]");
        var reference = new AiContracts.QuizImageReference(
                document.getId(), document.getDocumentVersion(), 2,
                new AiContracts.NormalizedBoundingBox(0, 0, 1, 1), "Sơ đồ trang 2");
        var question = new AiContracts.QuizQuestionDraft(
                "Sơ đồ thể hiện điều gì?", fourOptions(), 1, "Giải thích", List.of(citation), reference);
        var quiz = new AiContracts.QuizDraft("MCQ_SINGLE", "Visual Quiz", List.of(question));
        when(ai.generateQuiz(any(), anyString(), anyString())).thenReturn(new AiContracts.QuizGenerationResponse(
                "python-request", AiContracts.QuizGenerationStatus.DRAFT_CREATED, quiz));
        UUID imageId = UUID.randomUUID();
        when(imageMaterializer.materialize(any(), eq(document), eq(reference))).thenReturn(new QuizDraftData.Image(
                imageId, document.getId(), 1, 2, 0, 0, 1, 1,
                "quiz-images/synthetic.png", "Sơ đồ trang 2"));

        QuizApiModels.Draft result = service.createStudent(
                studentId, List.of(document.getId()), "Create 1 question", "request-image", "image-key");

        assertThat(result.questions().get(0).image().id()).isEqualTo(imageId);
        assertThat(result.questions().get(0).image().url()).isEqualTo("/api/v1/quiz-images/" + imageId);
        verify(imageMaterializer).materialize(any(), eq(document), eq(reference));
    }

    /** An image outside the cited page is rejected before Java reads object storage. */
    @Test
    void rejectsUncitedQuizImage() {
        UUID studentId = UUID.randomUUID();
        CourseMaterialDocument document = readyPersonal(studentId, 5);
        authorize(document, studentId, "PERSONAL");
        var citation = new AiContracts.Citation(
                document.getId(), document.getDocumentVersion(), 1, "Text evidence");
        var reference = new AiContracts.QuizImageReference(
                document.getId(), document.getDocumentVersion(), 2,
                new AiContracts.NormalizedBoundingBox(0, 0, 1, 1), "Sơ đồ trang 2");
        var question = new AiContracts.QuizQuestionDraft(
                "Question", fourOptions(), 1, "Explanation", List.of(citation), reference);
        when(ai.generateQuiz(any(), anyString(), anyString())).thenReturn(new AiContracts.QuizGenerationResponse(
                "python-request", AiContracts.QuizGenerationStatus.DRAFT_CREATED,
                new AiContracts.QuizDraft("MCQ_SINGLE", "Invalid image Quiz", List.of(question))));

        assertThatThrownBy(() -> service.createStudent(
                studentId, List.of(document.getId()), "Create 1 question", "request-image-2", "image-key-2"))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("AI_INVALID_QUIZ_IMAGE"));
        verify(imageMaterializer, never()).materialize(any(), any(), any());
    }

    /** Imported text must never carry a fabricated PDF citation. */
    @Test
    void rejectsImportedTextQuizWithPdfCitation() {
        UUID studentId = UUID.randomUUID();
        CourseMaterialDocument document = readyPersonal(studentId, 5);
        var citation = new AiContracts.Citation(
                document.getId(), document.getDocumentVersion(), 1, "Fabricated source");
        var question = new AiContracts.QuizQuestionDraft(
                "2 + 2 equals?", fourOptions(), 1, "Explanation", List.of(citation));
        var quiz = new AiContracts.QuizDraft(
                "MCQ_SINGLE", AiContracts.QuizDraftSource.IMPORTED_TEXT,
                "Invalid imported Quiz", List.of(question));

        assertThatThrownBy(() -> service.saveAssistantQuiz(
                studentId, "Import text", List.of(document), quiz))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("AI_INVALID_CITATION"));
        verify(drafts, never()).save(any(QuizDraftData.class));
    }

    /** A model response with fewer than four options is rejected and never persisted. */
    @Test
    void rejectsInvalidMcqShape() {
        UUID studentId = UUID.randomUUID();
        CourseMaterialDocument document = readyPersonal(studentId, 5);
        authorize(document, studentId, "PERSONAL");
        when(ai.generateQuiz(any(), anyString(), anyString())).thenReturn(
                generated(document, 2, List.of("A", "B", "C")));

        assertThatThrownBy(() -> service.createStudent(
                studentId, List.of(document.getId()), "Create 1 question", "request-2", "key-2"))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("AI_INVALID_QUIZ_SCHEMA"));

        verify(drafts, never()).save(any(QuizDraftData.class));
    }

    /** A Teacher citation outside the explicitly selected page interval is rejected before persistence. */
    @Test
    void rejectsTeacherCitationOutsideSelectedPages() {
        UUID teacherId = UUID.randomUUID();
        UUID offeringId = UUID.randomUUID();
        CourseOffering offering = new CourseOffering(
                offeringId, UUID.randomUUID(), UUID.randomUUID(), teacherId,
                "DB-01", "Database", "hash", "1234");
        CourseMaterialDocument document = readyCourseMaterial(teacherId, 8);
        authorize(document, teacherId, "COURSE_MATERIAL");
        when(offerings.findById(offeringId)).thenReturn(Optional.of(offering));
        when(ai.generateQuiz(any(), anyString(), anyString())).thenReturn(generated(document, 4, fourOptions()));
        var request = new QuizApiModels.TeacherGenerateRequest(
                List.of(document.getId()), offeringId, "Create one review question",
                1, "HARD", "Transactions", 1, 3);

        assertThatThrownBy(() -> service.createTeacher(teacherId, request, "request-3", "key-3"))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("AI_INVALID_CITATION"));

        verify(drafts, never()).save(any(QuizDraftData.class));
    }

    /** Retrying the same logical request returns one draft identity and does not call Python twice. */
    @Test
    void reusesDraftForSameIdempotentRequest() {
        UUID studentId = UUID.randomUUID();
        CourseMaterialDocument document = readyPersonal(studentId, 5);
        authorize(document, studentId, "PERSONAL");
        when(ai.generateQuiz(any(), anyString(), anyString())).thenReturn(generated(document, 2, fourOptions()));
        AtomicReference<QuizDraftData> persisted = new AtomicReference<>();
        when(drafts.save(any(QuizDraftData.class))).thenAnswer(invocation -> {
            QuizDraftData value = invocation.getArgument(0);
            persisted.set(value);
            return value;
        });
        when(drafts.findOwned(eq(studentId), any(UUID.class)))
                .thenAnswer(invocation -> Optional.ofNullable(persisted.get()));

        QuizApiModels.Draft first = service.createStudent(
                studentId, List.of(document.getId()), "Create 1 question hard", "request-4", "stable-key");
        QuizApiModels.Draft retry = service.createStudent(
                studentId, List.of(document.getId()), "Create 1 question hard", "request-5", "stable-key");

        assertThat(retry.id()).isEqualTo(first.id());
        verify(ai, times(1)).generateQuiz(any(), anyString(), anyString());
        verify(drafts, times(1)).save(any(QuizDraftData.class));
    }

    private void authorize(CourseMaterialDocument document, UUID ownerId, String scope) {
        when(documents.findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(document.getId(), ownerId, scope))
                .thenReturn(Optional.of(document));
        when(documents.findById(document.getId())).thenReturn(Optional.of(document));
    }

    private static CourseMaterialDocument readyPersonal(UUID ownerId, int pages) {
        CourseMaterialDocument document = CourseMaterialDocument.personal(
                UUID.randomUUID(), ownerId, "personal.pdf", "Personal PDF",
                "personal/synthetic.pdf", 128, pages, "a".repeat(64), NOW);
        document.markReady(pages, NOW);
        return document;
    }

    private static CourseMaterialDocument readyCourseMaterial(UUID ownerId, int pages) {
        CourseMaterialDocument document = new CourseMaterialDocument(
                UUID.randomUUID(), ownerId, "course.pdf", "Course PDF",
                "course/synthetic.pdf", 128, pages, NOW);
        document.markReady(pages, NOW);
        return document;
    }

    private static AiContracts.QuizGenerationResponse generated(
            CourseMaterialDocument document,
            int citationPage,
            List<String> options
    ) {
        var citation = new AiContracts.Citation(
                document.getId(), document.getDocumentVersion(), citationPage, "Synthetic evidence");
        var question = new AiContracts.QuizQuestionDraft(
                "Which answer is correct?", options, 1, "Synthetic explanation", List.of(citation));
        var quiz = new AiContracts.QuizDraft("MCQ_SINGLE", "Synthetic Quiz", List.of(question));
        return new AiContracts.QuizGenerationResponse(
                "python-request", AiContracts.QuizGenerationStatus.DRAFT_CREATED, quiz);
    }

    private static List<String> fourOptions() {
        return List.of("Option A", "Option B", "Option C", "Option D");
    }
}
