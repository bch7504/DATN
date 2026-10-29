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
import java.time.Clock;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
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
    private final Clock clock;

    /**
     * Args: document/draft/enrollment/offering stores, optional Python client and clock.
     * Input: Spring-managed dependencies. Output: Quiz application service. Errors: none.
     */
    public AiQuizService(
            CourseMaterialDocumentRepository documents,
            QuizDraftStore drafts,
            CourseEnrollmentRepository enrollments,
            CourseOfferingRepository offerings,
            ObjectProvider<AiServiceClient> aiProvider,
            Clock clock
    ) {
        this.documents = documents;
        this.drafts = drafts;
        this.enrollments = enrollments;
        this.offerings = offerings;
        this.aiProvider = aiProvider;
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
            return response(drafts.publish(teacherId, quizId, clock.instant()));
        } catch (IllegalStateException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "QUIZ_NOT_REVIEWABLE",
                    "Quiz không còn ở trạng thái chờ duyệt.");
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
        return saveValidated(ownerId, "PERSONAL_STUDENT", prompt, scope, authorized(scope), quiz,
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
        List<QuizDraftData.Question> questions = quiz.questions().stream().map(question ->
                new QuizDraftData.Question(
                        UUID.randomUUID(),
                        question.question(),
                        List.copyOf(question.options()),
                        question.correctOptionIndex(),
                        question.explanation(),
                        question.citations().stream().map(citation -> new QuizDraftData.Citation(
                                citation.documentId(), citation.documentVersion(), citation.pageNumber(), citation.excerpt()))
                                .toList()))
                .toList();
        return drafts.save(new QuizDraftData(
                draftId, ownerId, mode, prompt, quiz.title(), "REVIEW_REQUIRED", null, courseOfferingId,
                scope.stream().map(CourseMaterialDocument::getId).toList(), questions, clock.instant(), null));
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
                    || question.citations() == null
                    || question.citations().isEmpty()) {
                throw invalidAiQuiz("AI_INVALID_QUIZ_SCHEMA");
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
        }
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
            output.add(new QuizApiModels.Question(question.id(), question.questionText(), "MCQ_SINGLE", options,
                    OPTION_IDS.get(question.correctOptionIndex()), question.explanation(), citation));
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
