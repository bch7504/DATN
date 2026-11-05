package com.studyflow.review.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.courseoffering.domain.CourseOffering;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.courseoffering.domain.CourseOfferingStatus;
import com.studyflow.document.domain.CourseMaterialDocument;
import com.studyflow.document.domain.CourseMaterialDocumentRepository;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import com.studyflow.enrollment.domain.EnrollmentStatus;
import com.studyflow.integration.ai.AiContracts;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.integration.ai.AiServiceException;
import com.studyflow.review.api.QuizApiModels;
import com.studyflow.review.domain.QuizDraftData;
import com.studyflow.review.domain.QuizDraftStore;
import com.studyflow.review.domain.Quiz;
import com.studyflow.review.domain.QuizCreatorRole;
import com.studyflow.review.domain.QuizGenerationType;
import com.studyflow.review.domain.QuizQuestion;
import com.studyflow.review.domain.QuizQuestionRepository;
import com.studyflow.review.domain.QuizQuestionSource;
import com.studyflow.review.domain.QuizQuestionSourceRepository;
import com.studyflow.review.domain.QuizRepository;
import com.studyflow.review.domain.QuizSource;
import com.studyflow.review.domain.QuizSourceRepository;
import com.studyflow.review.domain.QuizStatus;
import java.time.Clock;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Validates authorized PDF scope and owns the AI Quiz draft/review lifecycle in Java. */
@Service
public class AiQuizService {
    private static final Pattern QUESTION_COUNT = Pattern.compile("(?iu)(\\d{1,2})\\s*(?:câu|questions?)");
    private static final List<String> OPTION_IDS = List.of("A", "B", "C", "D");

    private final CourseMaterialDocumentRepository documents;
    private final QuizDraftStore drafts;
    private final CourseEnrollmentRepository enrollments;
    private final CourseOfferingRepository offerings;
    private final ObjectProvider<AiServiceClient> aiProvider;
    private final QuizImageMaterializer imageMaterializer;
    private final QuizRepository quizzes;
    private final QuizQuestionRepository quizQuestions;
    private final QuizQuestionSourceRepository quizQuestionSources;
    private final QuizSourceRepository quizSources;
    private final Clock clock;

    /**
     * Args: document/draft/enrollment/offering stores, optional Python client, Quiz projection stores and clock.
     * Input: Spring-managed dependencies. Output: Quiz application service. Errors: none.
     */
    public AiQuizService(
            CourseMaterialDocumentRepository documents,
            QuizDraftStore drafts,
            CourseEnrollmentRepository enrollments,
            CourseOfferingRepository offerings,
            ObjectProvider<AiServiceClient> aiProvider,
            QuizImageMaterializer imageMaterializer,
            QuizRepository quizzes,
            QuizQuestionRepository quizQuestions,
            QuizQuestionSourceRepository quizQuestionSources,
            QuizSourceRepository quizSources,
            Clock clock
    ) {
        this.documents = documents;
        this.drafts = drafts;
        this.enrollments = enrollments;
        this.offerings = offerings;
        this.aiProvider = aiProvider;
        this.imageMaterializer = imageMaterializer;
        this.quizzes = quizzes;
        this.quizQuestions = quizQuestions;
        this.quizQuestionSources = quizQuestionSources;
        this.quizSources = quizSources;
        this.clock = clock;
    }

    /**
     * Args: Student, 1-10 owned Personal PDFs, free prompt, request ID and stable idempotency key.
     * Input: READY exact PDF versions. Output: REVIEW_REQUIRED MCQ_SINGLE draft.
     * Errors: 404 missing source, 409 non-ready, 422 invalid prompt/no evidence, 502/503 AI failure.
     */
    @Transactional
    public QuizApiModels.Draft createStudent(
            UUID studentId,
            List<UUID> documentIds,
            String prompt,
            String requestId,
            String idempotencyKey
    ) {
        List<CourseMaterialDocument> scope = personalScope(studentId, documentIds);
        String instruction = normalizePrompt(prompt, 500);
        int count = parseQuestionCount(instruction);
        AiContracts.QuizGenerationArgs args = new AiContracts.QuizGenerationArgs(
                count, parseDifficulty(instruction), null);
        QuizDraftData saved = generateAndSave(studentId, "PERSONAL_STUDENT", scope, authorized(scope),
                instruction, args, null, requestId, idempotencyKey);
        return response(saved);
    }

    /**
     * Args: Teacher, owned Course Material PDFs/class, explicit controls, request/idempotency IDs.
     * Input: READY PDFs and ACTIVE owned offering. Output: REVIEW_REQUIRED draft.
     * Errors: 403 non-owner, 404 missing, 409 non-ready/inactive, 422 controls/no evidence, 502/503 AI failure.
     */
    @Transactional
    public QuizApiModels.Draft createTeacher(
            UUID teacherId,
            QuizApiModels.TeacherGenerateRequest request,
            String requestId,
            String idempotencyKey
    ) {
        if (request.questionCount() < 1 || request.questionCount() > 30) {
            throw new ValidationException("INVALID_QUESTION_COUNT", "Số câu phải từ 1 đến 30.");
        }
        CourseOffering offering = offerings.findById(request.courseOfferingId())
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
        if (!offering.isOwnedBy(teacherId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không sở hữu lớp học phần này.");
        }
        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "COURSE_NOT_ACTIVE", "Lớp học phần không hoạt động.");
        }
        List<CourseMaterialDocument> scope = courseScope(teacherId, request.documentIds());
        if (request.pageFrom() == null || request.pageTo() == null || request.pageFrom() < 1
                || request.pageFrom() > request.pageTo()
                || scope.stream().anyMatch(document -> request.pageTo() > document.getPageCount())) {
            throw new ValidationException("INVALID_PAGE_RANGE", "Khoảng trang không hợp lệ.");
        }
        AiContracts.QuizDifficulty difficulty;
        try {
            difficulty = AiContracts.QuizDifficulty.valueOf(request.difficulty().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ValidationException("INVALID_DIFFICULTY", "Độ khó không hợp lệ.");
        }
        var args = new AiContracts.QuizGenerationArgs(request.questionCount(), difficulty,
                request.topic() == null || request.topic().isBlank() ? null : request.topic().trim());
        List<Integer> allowedPages = java.util.stream.IntStream.rangeClosed(request.pageFrom(), request.pageTo())
                .boxed().toList();
        QuizDraftData saved = generateAndSave(teacherId, "COURSE_TEACHER", scope,
                authorized(scope, allowedPages), normalizePrompt(request.instruction(), 1000), args,
                request.courseOfferingId(), requestId, idempotencyKey);
        return response(saved);
    }

    /** Args: owner and draft IDs. Input: Java-owned draft. Output: public review DTO. Errors: 404. */
    @Transactional(readOnly = true)
    public QuizApiModels.Draft get(UUID ownerId, UUID quizId) {
        return response(requireOwned(ownerId, quizId));
    }

    /**
     * Args: owner, source draft, replacement prompt, trace/key. Input: REVIEW_REQUIRED original.
     * Output: a NEW draft; original is unchanged. Errors: same as create plus 404 source.
     */
    @Transactional
    public QuizApiModels.Draft regenerate(
            UUID ownerId,
            UUID quizId,
            String prompt,
            String requestId,
            String idempotencyKey
    ) {
        QuizDraftData original = requireOwned(ownerId, quizId);
        if (!"PERSONAL_STUDENT".equals(original.mode())) {
            throw new ValidationException("INVALID_QUIZ_MODE", "Không thể tạo lại Quiz này từ màn hình Sinh viên.");
        }
        return createStudent(ownerId, original.sourceDocumentIds(), prompt, requestId, idempotencyKey);
    }

    /**
     * Args: Student, draft and destination. Input: REVIEW_REQUIRED draft and optional APPROVED offering.
     * Output: READY Quiz. Errors: 404, 409 lifecycle/enrollment or 422 destination.
     */
    @Transactional
    public QuizApiModels.AcceptedQuiz accept(UUID studentId, UUID quizId, String destinationType, UUID offeringId) {
        String destination = destinationType == null ? "" : destinationType.trim().toUpperCase(Locale.ROOT);
        String offeringCode = null;
        if ("PERSONAL".equals(destination)) {
            if (offeringId != null) throw new ValidationException("INVALID_DESTINATION", "Quiz cá nhân không gắn lớp học phần.");
        } else if ("COURSE_OFFERING".equals(destination)) {
            if (offeringId == null || enrollments.findByCourseOfferingIdAndStudentId(offeringId, studentId)
                    .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.APPROVED).isEmpty()) {
                throw new ApiException(HttpStatus.CONFLICT, "ENROLLMENT_REQUIRED",
                        "Bạn chưa được duyệt vào lớp học phần đã chọn.");
            }
            CourseOffering offering = offerings.findById(offeringId)
                    .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
            offeringCode = offering.getCode();
        } else {
            throw new ValidationException("INVALID_DESTINATION", "Nơi lưu Quiz không hợp lệ.");
        }
        try {
            QuizDraftData accepted = drafts.accept(studentId, quizId, destination, offeringId, clock.instant());
            promoteToPracticeQuiz(accepted, QuizCreatorRole.STUDENT, QuizStatus.READY);
            return acceptedResponse(accepted, offeringCode);
        } catch (IllegalStateException exception) {
            if (drafts.findOwned(studentId, quizId).isEmpty()) {
                throw new ResourceNotFoundException("QUIZ_NOT_FOUND", "Không tìm thấy Quiz.");
            }
            throw new ApiException(HttpStatus.CONFLICT, "QUIZ_NOT_REVIEWABLE", "Quiz không còn ở trạng thái chờ duyệt.");
        }
    }

    /** Args: owner and draft. Input: REVIEW_REQUIRED Quiz. Output: void. Errors: 404/409. */
    @Transactional
    public void reject(UUID ownerId, UUID quizId) {
        try {
            drafts.reject(ownerId, quizId);
        } catch (IllegalStateException exception) {
            if (drafts.findOwned(ownerId, quizId).isEmpty()) {
                throw new ResourceNotFoundException("QUIZ_NOT_FOUND", "Không tìm thấy Quiz.");
            }
            throw new ApiException(HttpStatus.CONFLICT, "QUIZ_NOT_REVIEWABLE", "Quiz không còn ở trạng thái chờ duyệt.");
        }
    }

    /**
     * Args: Teacher owner and REVIEW_REQUIRED draft. Input: active owned source offering saved with draft.
     * Output: PUBLISHED draft. Errors: 404 missing, 409 invalid lifecycle/inactive class, 403 non-owner class.
     */
    @Transactional
    public QuizApiModels.Draft publishTeacher(UUID teacherId, UUID quizId) {
        QuizDraftData current = requireOwned(teacherId, quizId);
        if (!"COURSE_TEACHER".equals(current.mode()) || current.courseOfferingId() == null) {
            throw new ValidationException("INVALID_QUIZ_MODE", "Quiz này không thuộc luồng của Giảng viên.");
        }
        CourseOffering offering = offerings.findById(current.courseOfferingId())
                .orElseThrow(() -> new ResourceNotFoundException("COURSE_NOT_FOUND", "Không tìm thấy lớp học phần."));
        if (!offering.isOwnedBy(teacherId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không sở hữu lớp học phần này.");
        }
        if (offering.getStatus() != CourseOfferingStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "COURSE_NOT_ACTIVE", "Lớp học phần không hoạt động.");
        }
        try {
            QuizDraftData published = drafts.publish(teacherId, quizId, clock.instant());
            promoteToPracticeQuiz(published, QuizCreatorRole.TEACHER, QuizStatus.PUBLISHED);
            return response(published);
        } catch (IllegalStateException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "QUIZ_NOT_REVIEWABLE",
                    "Quiz không còn ở trạng thái chờ duyệt.");
        }
    }

    /**
     * Args: accepted/published AI draft, creator role and target lifecycle status.
     * Input: one validated Java-owned draft; MCQ_SINGLE has exactly four options per question.
     * Output: void; creates the scoring/review projection with the same Quiz/question identifiers.
     * Side effects: writes app.quizzes, app.quiz_questions and grounded app.quiz_sources once.
     * Errors: database failures roll back the draft lifecycle transition in the enclosing transaction.
     */
    private void promoteToPracticeQuiz(
            QuizDraftData draft,
            QuizCreatorRole creatorRole,
            QuizStatus status
    ) {
        if (quizzes.existsById(draft.id())) return;
        Instant now = draft.acceptedAt() == null ? clock.instant() : draft.acceptedAt();
        QuizGenerationType generationType = creatorRole == QuizCreatorRole.TEACHER
                ? QuizGenerationType.COURSE_TEACHER
                : QuizGenerationType.PERSONAL_STUDENT;
        quizzes.save(new Quiz(
                draft.id(), draft.ownerId(), creatorRole, draft.courseOfferingId(), draft.title(),
                "Quiz được tạo và duyệt trong StudyFlow.", draft.prompt(), generationType, status,
                draft.questions().size(), null, draft.createdAt(), now));

        List<QuizQuestion> projectedQuestions = new ArrayList<>();
        List<QuizQuestionSource> projectedQuestionSources = new ArrayList<>();
        Map<UUID, SourceRange> ranges = new LinkedHashMap<>();
        for (int index = 0; index < draft.questions().size(); index++) {
            QuizDraftData.Question question = draft.questions().get(index);
            projectedQuestions.add(new QuizQuestion(
                    question.id(), draft.id(), question.questionText(),
                    question.options().get(0), question.options().get(1),
                    question.options().get(2), question.options().get(3),
                    question.correctOptionIndex(), question.explanation(), index + 1, now));
            for (int citationIndex = 0; citationIndex < question.citations().size(); citationIndex++) {
                QuizDraftData.Citation citation = question.citations().get(citationIndex);
                projectedQuestionSources.add(new QuizQuestionSource(
                        UUID.nameUUIDFromBytes((question.id() + "|citation|" + citationIndex)
                                .getBytes(StandardCharsets.UTF_8)),
                        question.id(), citation.documentId(), citation.pageNumber(), citation.excerpt(), now));
                ranges.merge(
                        citation.documentId(),
                        new SourceRange(citation.documentVersion(), citation.pageNumber(), citation.pageNumber()),
                        SourceRange::merge);
            }
        }
        quizQuestions.saveAll(projectedQuestions);
        quizQuestionSources.saveAll(projectedQuestionSources);

        String sourceType = creatorRole == QuizCreatorRole.TEACHER
                ? AiContracts.SourceType.COURSE_MATERIAL_PDF.name()
                : AiContracts.SourceType.PERSONAL_PDF.name();
        List<QuizSource> projectedSources = ranges.entrySet().stream().map(entry -> new QuizSource(
                UUID.nameUUIDFromBytes((draft.id() + "|source|" + entry.getKey()).getBytes(StandardCharsets.UTF_8)),
                draft.id(), entry.getKey(), entry.getValue().documentVersion(),
                entry.getValue().pageFrom(), entry.getValue().pageTo(), sourceType, now)).toList();
        quizSources.saveAll(projectedSources);
    }

    /** Grounded page range for one immutable document version in the scoring projection. */
    private record SourceRange(int documentVersion, int pageFrom, int pageTo) {
        /** Args: two ranges for one document. Output: merged inclusive range. Errors: mismatched versions. */
        private SourceRange merge(SourceRange other) {
            if (documentVersion != other.documentVersion) {
                throw new IllegalStateException("One Quiz cannot project multiple versions of the same document");
            }
            return new SourceRange(documentVersion, Math.min(pageFrom, other.pageFrom), Math.max(pageTo, other.pageTo));
        }
    }

    /**
     * Args: owner ID, original prompt, authorized Personal PDFs and structured Quiz returned by Python.
     * Input: conversation scope already owned and READY. Output: Java-owned REVIEW_REQUIRED draft.
     * Errors: 502 when the Quiz shape or citation leaves the authorized PDF scope.
     */
    @Transactional
    public QuizDraftData saveAssistantQuiz(
            UUID ownerId,
            String prompt,
            List<CourseMaterialDocument> scope,
            AiContracts.QuizDraft quiz
    ) {
        String mode = quiz != null && quiz.sourceType() == AiContracts.QuizDraftSource.IMPORTED_TEXT
                ? "IMPORTED_TEXT_STUDENT"
                : "PERSONAL_STUDENT";
        List<AiContracts.AuthorizedDocument> authorizedScope = "IMPORTED_TEXT_STUDENT".equals(mode)
                ? List.of()
                : authorized(scope);
        return saveValidated(ownerId, mode, prompt, scope, authorizedScope, quiz,
                null, null, UUID.randomUUID());
    }

    private QuizDraftData generateAndSave(
            UUID actorId,
            String mode,
            List<CourseMaterialDocument> scope,
            List<AiContracts.AuthorizedDocument> authorizedScope,
            String instruction,
            AiContracts.QuizGenerationArgs args,
            UUID courseOfferingId,
            String requestId,
            String idempotencyKey
    ) {
        UUID draftId = operationId(actorId, mode, scope, authorizedScope, instruction, args,
                courseOfferingId, idempotencyKey);
        var existing = drafts.findOwned(actorId, draftId);
        if (existing.isPresent()) return existing.get();

        AiServiceClient ai = aiProvider.getIfAvailable();
        if (ai == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_NOT_CONFIGURED",
                    "Dịch vụ AI chưa được cấu hình.");
        }
        AiContracts.QuizGenerationResponse generated;
        try {
            generated = ai.generateQuiz(new AiContracts.QuizGenerationRequest(
                            actorId,
                            AiContracts.QuizGenerationMode.valueOf(mode),
                            authorizedScope,
                            instruction,
                            args),
                    requestId,
                    idempotencyKey);
        } catch (AiServiceException exception) {
            throw mapAi(exception);
        }
        if (generated.status() == AiContracts.QuizGenerationStatus.NO_EVIDENCE) {
            throw new ValidationException("NO_EVIDENCE", "Không đủ bằng chứng trong tài liệu để tạo Quiz.");
        }
        if (generated.quiz() == null
                || generated.quiz().sourceType() != AiContracts.QuizDraftSource.PDF_GROUNDED) {
            throw invalidAiQuiz("AI_INVALID_QUIZ_SOURCE");
        }
        return saveValidated(actorId, mode, instruction, scope, authorizedScope, generated.quiz(),
                courseOfferingId, args.questionCount(), draftId);
    }

    private QuizDraftData saveValidated(
            UUID ownerId,
            String mode,
            String prompt,
            List<CourseMaterialDocument> scope,
            List<AiContracts.AuthorizedDocument> authorizedScope,
            AiContracts.QuizDraft quiz,
            UUID courseOfferingId,
            Integer expectedQuestionCount,
            UUID draftId
    ) {
        validateQuizOutput(quiz, scope, authorizedScope, expectedQuestionCount);
        HashMap<UUID, CourseMaterialDocument> documentsById = new HashMap<>();
        scope.forEach(document -> documentsById.put(document.getId(), document));
        List<QuizDraftData.Question> questions = new ArrayList<>();
        List<QuizDraftData.Image> createdImages = new ArrayList<>();
        for (int index = 0; index < quiz.questions().size(); index++) {
            AiContracts.QuizQuestionDraft question = quiz.questions().get(index);
            UUID questionId = UUID.nameUUIDFromBytes(
                    (draftId + "|question|" + index).getBytes(StandardCharsets.UTF_8));
            QuizDraftData.Image image = null;
            if (question.image() != null) {
                image = imageMaterializer.materialize(
                        questionId, documentsById.get(question.image().documentId()), question.image());
                createdImages.add(image);
            }
            questions.add(new QuizDraftData.Question(
                    questionId,
                    question.question(),
                    List.copyOf(question.options()),
                    question.correctOptionIndex(),
                    question.explanation(),
                    question.citations().stream().map(citation -> new QuizDraftData.Citation(
                            citation.documentId(), citation.documentVersion(), citation.pageNumber(), citation.excerpt()))
                            .toList(),
                    image));
        }
        try {
            return drafts.save(new QuizDraftData(
                    draftId, ownerId, mode, prompt, quiz.title(), "REVIEW_REQUIRED", null, courseOfferingId,
                    quiz.sourceType() == AiContracts.QuizDraftSource.IMPORTED_TEXT
                            ? List.of()
                            : scope.stream().map(CourseMaterialDocument::getId).toList(),
                    questions, clock.instant(), null));
        } catch (RuntimeException exception) {
            createdImages.forEach(imageMaterializer::deleteQuietly);
            throw exception;
        }
    }

    /**
     * Args: actor, mode, exact authorized request and idempotency key. Input: validated generation controls.
     * Output: deterministic UUID for one logical mutation. Errors: none; caller validates key length first.
     */
    private static UUID operationId(
            UUID actorId,
            String mode,
            List<CourseMaterialDocument> scope,
            List<AiContracts.AuthorizedDocument> authorizedScope,
            String instruction,
            AiContracts.QuizGenerationArgs args,
            UUID courseOfferingId,
            String idempotencyKey
    ) {
        String identity = "studyflow-ai-quiz-v1|" + actorId + "|" + mode + "|" + idempotencyKey
                + "|" + instruction + "|" + args + "|" + courseOfferingId
                + "|" + scope.stream().map(CourseMaterialDocument::getId).toList()
                + "|" + authorizedScope;
        return UUID.nameUUIDFromBytes(identity.getBytes(StandardCharsets.UTF_8));
    }

    private List<CourseMaterialDocument> personalScope(UUID ownerId, List<UUID> ids) {
        validateIds(ids);
        return ids.stream().map(id -> documents
                        .findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(id, ownerId, "PERSONAL")
                        .orElseThrow(() -> new ResourceNotFoundException("DOCUMENT_NOT_FOUND", "Không tìm thấy tài liệu cá nhân.")))
                .peek(AiQuizService::requireReady)
                .toList();
    }

    private List<CourseMaterialDocument> courseScope(UUID ownerId, List<UUID> ids) {
        validateIds(ids);
        return ids.stream().map(id -> documents
                        .findByIdAndOwnerIdAndDocumentScopeAndDeletedAtIsNull(id, ownerId, "COURSE_MATERIAL")
                        .orElseThrow(() -> new ResourceNotFoundException("DOCUMENT_NOT_FOUND", "Không tìm thấy học liệu.")))
                .peek(AiQuizService::requireReady)
                .peek(document -> {
                    if (!document.isSlidePdf()) {
                        throw new ValidationException("INVALID_MATERIAL_TYPE",
                                "Chỉ SLIDE_PDF được dùng để sinh Quiz AI.");
                    }
                })
                .toList();
    }

    private static void validateIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty() || ids.size() > 10 || ids.stream().anyMatch(java.util.Objects::isNull)
                || new HashSet<>(ids).size() != ids.size()) {
            throw new ValidationException("INVALID_DOCUMENT_SELECTION", "Hãy chọn từ 1 đến 10 tài liệu không trùng nhau.");
        }
    }

    private static void requireReady(CourseMaterialDocument document) {
        if (!"READY".equals(document.getProcessingStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "DOCUMENT_NOT_READY", "Tài liệu chưa sẵn sàng cho AI.");
        }
    }

    private static List<AiContracts.AuthorizedDocument> authorized(List<CourseMaterialDocument> scope) {
        return authorized(scope, null);
    }

    private static List<AiContracts.AuthorizedDocument> authorized(
            List<CourseMaterialDocument> scope,
            List<Integer> allowedPages
    ) {
        return scope.stream().map(document -> new AiContracts.AuthorizedDocument(
                document.getId(), document.getDocumentVersion(), document.getOwnerId(),
                "PERSONAL".equals(document.getDocumentScope())
                        ? AiContracts.SourceType.PERSONAL_PDF
                        : AiContracts.SourceType.COURSE_MATERIAL_PDF,
                allowedPages)).toList();
    }

    /**
     * Args: structured AI draft, Java-authorized documents/pages and optional expected count.
     * Input: untrusted Python/model output. Output: void for a grounded MCQ_SINGLE draft.
     * Errors: 502 when shape, count, answer or citation leaves the Java-authorized contract.
     */
    private static void validateQuizOutput(
            AiContracts.QuizDraft quiz,
            List<CourseMaterialDocument> scope,
            List<AiContracts.AuthorizedDocument> authorizedScope,
            Integer expectedQuestionCount
    ) {
        if (quiz == null
                || !"MCQ_SINGLE".equals(quiz.quizType())
                || quiz.sourceType() == null
                || quiz.title() == null
                || quiz.title().isBlank()
                || quiz.title().length() > 200
                || quiz.questions() == null
                || quiz.questions().isEmpty()
                || quiz.questions().size() > 30
                || expectedQuestionCount != null && quiz.questions().size() != expectedQuestionCount) {
            throw invalidAiQuiz("AI_INVALID_QUIZ_SCHEMA");
        }
        var allowed = new java.util.HashMap<UUID, CourseMaterialDocument>();
        scope.forEach(document -> allowed.put(document.getId(), document));
        var allowedPages = new java.util.HashMap<UUID, Set<Integer>>();
        authorizedScope.forEach(document -> allowedPages.put(
                document.documentId(),
                document.allowedPages() == null ? null : Set.copyOf(document.allowedPages())));
        for (AiContracts.QuizQuestionDraft question : quiz.questions()) {
            if (question == null
                    || question.question() == null
                    || question.question().isBlank()
                    || question.options() == null
                    || question.options().size() != 4
                    || question.options().stream().anyMatch(option -> option == null || option.isBlank())
                    || new HashSet<>(question.options()).size() != 4
                    || question.correctOptionIndex() < 0
                    || question.correctOptionIndex() >= 4
                    || question.explanation() == null
                    || question.explanation().isBlank()
                    || question.citations() == null) {
                throw invalidAiQuiz("AI_INVALID_QUIZ_SCHEMA");
            }
            if (quiz.sourceType() == AiContracts.QuizDraftSource.PDF_GROUNDED
                    && question.citations().isEmpty()) {
                throw invalidAiQuiz("AI_INVALID_QUIZ_SCHEMA");
            }
            if (quiz.sourceType() == AiContracts.QuizDraftSource.IMPORTED_TEXT
                    && !question.citations().isEmpty()) {
                throw invalidAiQuiz("AI_INVALID_CITATION");
            }
            for (AiContracts.Citation citation : question.citations()) {
                if (citation == null) throw invalidAiQuiz("AI_INVALID_CITATION");
                CourseMaterialDocument document = allowed.get(citation.documentId());
                if (document == null || document.getDocumentVersion() != citation.documentVersion()
                        || citation.pageNumber() < 1
                        || citation.pageNumber() > document.getPageCount()
                        || citation.excerpt() == null
                        || citation.excerpt().isBlank()) {
                    throw invalidAiQuiz("AI_INVALID_CITATION");
                }
                Set<Integer> pages = allowedPages.get(citation.documentId());
                if (pages != null && !pages.contains(citation.pageNumber())) {
                    throw invalidAiQuiz("AI_INVALID_CITATION");
                }
            }
            validateImage(question, quiz.sourceType(), allowed, allowedPages);
        }
    }

    /**
     * Args: one AI question, draft source and Java-authorized document/page maps.
     * Input: untrusted optional image reference. Output: void when it is safe to materialize.
     * Errors: 502 for imported, out-of-scope, malformed or uncited image references.
     */
    private static void validateImage(
            AiContracts.QuizQuestionDraft question,
            AiContracts.QuizDraftSource sourceType,
            java.util.Map<UUID, CourseMaterialDocument> allowed,
            java.util.Map<UUID, Set<Integer>> allowedPages
    ) {
        AiContracts.QuizImageReference image = question.image();
        if (image == null) return;
        if (sourceType != AiContracts.QuizDraftSource.PDF_GROUNDED
                || image.documentId() == null
                || image.bbox() == null
                || image.altText() == null
                || image.altText().isBlank()
                || image.altText().length() > 300) {
            throw invalidAiQuiz("AI_INVALID_QUIZ_IMAGE");
        }
        CourseMaterialDocument document = allowed.get(image.documentId());
        Set<Integer> pages = allowedPages.get(image.documentId());
        if (document == null
                || image.documentVersion() != document.getDocumentVersion()
                || image.pageNumber() < 1
                || image.pageNumber() > document.getPageCount()
                || pages != null && !pages.contains(image.pageNumber())
                || !validBoundingBox(image.bbox())) {
            throw invalidAiQuiz("AI_INVALID_QUIZ_IMAGE");
        }
        boolean cited = question.citations().stream().anyMatch(citation ->
                citation.documentId().equals(image.documentId())
                        && citation.documentVersion() == image.documentVersion()
                        && citation.pageNumber() == image.pageNumber());
        if (!cited) throw invalidAiQuiz("AI_INVALID_QUIZ_IMAGE");
    }

    private static boolean validBoundingBox(AiContracts.NormalizedBoundingBox bbox) {
        return Double.isFinite(bbox.x()) && Double.isFinite(bbox.y())
                && Double.isFinite(bbox.width()) && Double.isFinite(bbox.height())
                && bbox.x() >= 0 && bbox.y() >= 0
                && bbox.width() > 0 && bbox.height() > 0
                && bbox.x() + bbox.width() <= 1
                && bbox.y() + bbox.height() <= 1;
    }

    /** Args: stable safe error code. Input: failed AI output validation. Output: caller-facing 502 exception. */
    private static ApiException invalidAiQuiz(String code) {
        return new ApiException(HttpStatus.BAD_GATEWAY, code,
                "AI trả về bản nháp Quiz không đúng cấu trúc hoặc nguồn được phép.");
    }

    private QuizDraftData requireOwned(UUID ownerId, UUID quizId) {
        return drafts.findOwned(ownerId, quizId)
                .orElseThrow(() -> new ResourceNotFoundException("QUIZ_NOT_FOUND", "Không tìm thấy Quiz."));
    }

    private QuizApiModels.Draft response(QuizDraftData draft) {
        return new QuizApiModels.Draft(draft.id(), draft.prompt(), draft.sourceDocumentIds(), draft.status(),
                questions(draft), draft.createdAt());
    }

    private QuizApiModels.AcceptedQuiz acceptedResponse(QuizDraftData draft, String offeringCode) {
        return new QuizApiModels.AcceptedQuiz(draft.id(), draft.title(), draft.status(), draft.courseOfferingId(), offeringCode,
                "PERSONAL".equals(draft.destinationType()), draft.questions().size(), questions(draft),
                draft.createdAt(), draft.acceptedAt());
    }

    private List<QuizApiModels.Question> questions(QuizDraftData draft) {
        List<QuizApiModels.Question> output = new ArrayList<>();
        for (QuizDraftData.Question question : draft.questions()) {
            List<QuizApiModels.Option> options = new ArrayList<>();
            for (int index = 0; index < question.options().size(); index++) {
                options.add(new QuizApiModels.Option(OPTION_IDS.get(index), question.options().get(index)));
            }
            QuizApiModels.Citation citation = question.citations().isEmpty() ? null : citation(question.citations().get(0));
            QuizApiModels.QuestionImage image = question.image() == null ? null : new QuizApiModels.QuestionImage(
                    question.image().id(), "/api/v1/quiz-images/" + question.image().id(), question.image().altText());
            output.add(new QuizApiModels.Question(question.id(), question.questionText(), "MCQ_SINGLE", options,
                    OPTION_IDS.get(question.correctOptionIndex()), question.explanation(), citation, image));
        }
        return output;
    }

    private QuizApiModels.Citation citation(QuizDraftData.Citation citation) {
        String name = documents.findById(citation.documentId())
                .map(CourseMaterialDocument::getDisplayName).orElse("Tài liệu PDF");
        return new QuizApiModels.Citation(citation.documentId(), name, citation.pageNumber(), citation.excerpt());
    }

    private static String normalizePrompt(String prompt, int max) {
        String value = prompt == null ? "" : prompt.trim();
        if (value.isEmpty() || value.length() > max) {
            throw new ValidationException("INVALID_QUIZ_PROMPT", "Yêu cầu sinh Quiz không hợp lệ.");
        }
        return value;
    }

    private static int parseQuestionCount(String prompt) {
        Matcher matcher = QUESTION_COUNT.matcher(prompt);
        if (!matcher.find()) {
            throw new ValidationException("QUESTION_COUNT_REQUIRED", "Hãy ghi rõ số câu muốn tạo trong yêu cầu.");
        }
        int count = Integer.parseInt(matcher.group(1));
        if (count < 1 || count > 30) {
            throw new ValidationException("INVALID_QUESTION_COUNT", "Số câu phải từ 1 đến 30.");
        }
        return count;
    }

    private static AiContracts.QuizDifficulty parseDifficulty(String prompt) {
        String value = prompt.toLowerCase(Locale.ROOT);
        if (value.contains("khó") || value.contains("hard")) return AiContracts.QuizDifficulty.HARD;
        if (value.contains("dễ") || value.contains("easy")) return AiContracts.QuizDifficulty.EASY;
        if (value.contains("trung bình") || value.contains("medium")) return AiContracts.QuizDifficulty.MEDIUM;
        return AiContracts.QuizDifficulty.MIXED;
    }

    private static ApiException mapAi(AiServiceException exception) {
        HttpStatus status = exception.statusCode() == 503 ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
        return new ApiException(status, exception.code(), "Không thể hoàn tất yêu cầu AI.");
    }
}
