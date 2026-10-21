package com.studyflow.material.application;

import com.studyflow.common.exception.ApiException;
import com.studyflow.document.application.CourseMaterialLibraryService;
import com.studyflow.integration.ai.AiContracts;
import com.studyflow.integration.ai.AiServiceClient;
import com.studyflow.integration.ai.AiServiceException;
import com.studyflow.material.api.CourseMaterialTutorResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Coordinates Student authorization, Python Tutor execution and Java citation revalidation. */
@Service
public class CourseMaterialTutorService {
    private final CourseMaterialLibraryService materials;
    private final ObjectProvider<AiServiceClient> aiClientProvider;

    public CourseMaterialTutorService(
            CourseMaterialLibraryService materials,
            ObjectProvider<AiServiceClient> aiClientProvider
    ) {
        this.materials = materials;
        this.aiClientProvider = aiClientProvider;
    }

    /**
     * Args: authenticated Student, URL document/page, trimmed question and request trace ID.
     * Input: Java-authorized publication/enrollment scope only. Output: ANSWERED with validated
     * citations or NO_EVIDENCE. Errors: authorization/document errors from material service;
     * 503 when AI is disabled/unavailable; 502 when Python violates the authorized scope.
     */
    public CourseMaterialTutorResponse ask(
            UUID studentId,
            UUID documentId,
            int pageNumber,
            String question,
            String requestId
    ) {
        CourseMaterialLibraryService.TutorScope scope = materials.authorizeTutor(studentId, documentId, pageNumber);
        AiServiceClient aiClient = aiClientProvider.getIfAvailable();
        if (aiClient == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_UNAVAILABLE",
                    "Chức năng hỏi đáp học liệu chưa được cấu hình.");
        }
        AiContracts.AuthorizedDocument authorizedDocument = new AiContracts.AuthorizedDocument(
                scope.documentId(), scope.documentVersion(), scope.ownerId(),
                AiContracts.SourceType.COURSE_MATERIAL_PDF, null);
        AiContracts.CourseMaterialAskResponse response;
        try {
            response = aiClient.askCourseMaterial(new AiContracts.CourseMaterialAskRequest(
                    studentId, scope.courseOfferingId(), authorizedDocument, pageNumber, question.strip()), requestId);
        } catch (AiServiceException error) {
            HttpStatus status = error.statusCode() == 422 ? HttpStatus.UNPROCESSABLE_ENTITY
                    : error.statusCode() == 409 ? HttpStatus.CONFLICT : HttpStatus.SERVICE_UNAVAILABLE;
            String code = status == HttpStatus.SERVICE_UNAVAILABLE ? "AI_SERVICE_UNAVAILABLE" : error.code();
            throw new ApiException(status, code,
                    status == HttpStatus.SERVICE_UNAVAILABLE
                            ? "Dịch vụ hỏi đáp tài liệu tạm thời không khả dụng."
                            : error.getMessage());
        }
        List<CourseMaterialTutorResponse.CitationResponse> citations = response.result().citations() == null
                ? List.of()
                : response.result().citations().stream().map(citation -> {
                    if (!scope.documentId().equals(citation.documentId())
                            || scope.documentVersion() != citation.documentVersion()
                            || citation.pageNumber() < 1 || citation.pageNumber() > scope.pageCount()) {
                        throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_INVALID_CITATION",
                                "Nguồn trích dẫn từ dịch vụ AI không hợp lệ.");
                    }
                    return new CourseMaterialTutorResponse.CitationResponse(citation.documentId(),
                            scope.documentName(), citation.pageNumber(), citation.excerpt());
                }).toList();
        return new CourseMaterialTutorResponse(response.result().status().name(), response.result().answer(),
                citations, response.requestId());
    }
}
