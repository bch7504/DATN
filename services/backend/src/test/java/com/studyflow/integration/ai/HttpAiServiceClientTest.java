package com.studyflow.integration.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.integration.ai.AiContracts.AuthorizedDocument;
import com.studyflow.integration.ai.AiContracts.QuizDifficulty;
import com.studyflow.integration.ai.AiContracts.QuizGenerationArgs;
import com.studyflow.integration.ai.AiContracts.QuizGenerationMode;
import com.studyflow.integration.ai.AiContracts.QuizGenerationRequest;
import com.studyflow.integration.ai.AiContracts.QuizGenerationStatus;
import com.studyflow.integration.ai.AiContracts.SourceType;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class HttpAiServiceClientTest {
    private static final String TOKEN = "test-internal-token-123456";
    private static final UUID ACTOR_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID DOCUMENT_ID = UUID.fromString("00000000-0000-4000-8000-000000000002");
    private RestClient.Builder builder;
    private MockRestServiceServer server;
    private HttpAiServiceClient client;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder().baseUrl("http://ai.internal");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new HttpAiServiceClient(builder.build(), new ObjectMapper(), TOKEN);
    }

    @Test
    void healthSendsServiceHeadersAndAcceptsSchemaThree() {
        server.expect(requestTo("http://ai.internal/internal/v1/health"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + TOKEN))
                .andExpect(header("X-Request-Id", "req-health-001"))
                .andExpect(header("X-Schema-Version", "3"))
                .andRespond(withSuccess("""
                        {"service":"studyflow-ai","version":"0.1.0","status":"UP",
                         "readiness":"READY","schemaVersion":"3","requestId":"req-health-001",
                         "missingConfiguration":[]}
                        """, MediaType.APPLICATION_JSON));

        AiContracts.HealthResponse response = client.health("req-health-001");

        assertThat(response.readiness()).isEqualTo("READY");
        server.verify();
    }

    @Test
    void quizGenerationRequiresHeadersAndValidatesFourOptionSchema() {
        server.expect(requestTo("http://ai.internal/internal/v1/quizzes/generate"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + TOKEN))
                .andExpect(header("X-Request-Id", "req-quiz-001"))
                .andExpect(header("X-Schema-Version", "3"))
                .andExpect(header("Idempotency-Key", "quiz-key-001"))
                .andRespond(withSuccess(validQuizJson("req-quiz-001"), MediaType.APPLICATION_JSON));

        AiContracts.QuizGenerationResponse response = client.generateQuiz(
                personalQuizRequest(), "req-quiz-001", "quiz-key-001");

        assertThat(response.status()).isEqualTo(QuizGenerationStatus.DRAFT_CREATED);
        assertThat(response.quiz().questions().get(0).options()).hasSize(4);
        server.verify();
    }

    @Test
    void quizGenerationRejectsMalformedProviderOutput() {
        server.expect(requestTo("http://ai.internal/internal/v1/quizzes/generate"))
                .andRespond(withSuccess("""
                        {"requestId":"req-quiz-002","status":"DRAFT_CREATED","quiz":{
                          "quizType":"MCQ_SINGLE","title":"ACID","questions":[{
                            "question":"ACID?","options":["A","B","C"],"correctOptionIndex":0,
                            "explanation":"Test","citations":[{"documentId":"%s",
                            "documentVersion":1,"pageNumber":1,"excerpt":"Evidence"}] }]}}
                        """.formatted(DOCUMENT_ID), MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.generateQuiz(
                personalQuizRequest(), "req-quiz-002", "quiz-key-002"))
                .isInstanceOf(AiServiceException.class)
                .extracting(error -> ((AiServiceException) error).code())
                .isEqualTo("AI_INVALID_RESPONSE");
        server.verify();
    }

    @Test
    void downstreamErrorEnvelopeIsMappedWithoutLeakingRawBody() {
        server.expect(requestTo("http://ai.internal/internal/v1/health"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"error":{"code":"AI_NOT_READY","message":"AI configuration is incomplete",
                                 "requestId":"req-health-002"}}
                                """));

        assertThatThrownBy(() -> client.health("req-health-002"))
                .isInstanceOf(AiServiceException.class)
                .satisfies(error -> {
                    AiServiceException mapped = (AiServiceException) error;
                    assertThat(mapped.statusCode()).isEqualTo(503);
                    assertThat(mapped.code()).isEqualTo("AI_NOT_READY");
                    assertThat(mapped.requestId()).isEqualTo("req-health-002");
                    assertThat(mapped.getMessage()).doesNotContain("token");
                });
        server.verify();
    }

    @Test
    void invalidRequestIdentityFailsBeforeCallingPython() {
        assertThatThrownBy(() -> client.generateQuiz(personalQuizRequest(), "bad", "short"))
                .isInstanceOf(IllegalArgumentException.class);
        server.verify();
    }

    private static QuizGenerationRequest personalQuizRequest() {
        AuthorizedDocument document = new AuthorizedDocument(
                DOCUMENT_ID, 1, ACTOR_ID, SourceType.PERSONAL_PDF, List.of(1, 2));
        return new QuizGenerationRequest(
                ACTOR_ID,
                QuizGenerationMode.PERSONAL_STUDENT,
                List.of(document),
                "Tạo một câu hỏi về ACID",
                new QuizGenerationArgs(1, QuizDifficulty.MEDIUM, "ACID"));
    }

    private static String validQuizJson(String requestId) {
        return """
                {"requestId":"%s","status":"DRAFT_CREATED","quiz":{
                  "quizType":"MCQ_SINGLE","title":"ACID","questions":[{
                    "question":"Thuộc tính nào bảo đảm giao dịch toàn vẹn?",
                    "options":["Atomicity","Index","View","Trigger"],"correctOptionIndex":0,
                    "explanation":"Atomicity là tính nguyên tử.","citations":[{
                      "documentId":"%s","documentVersion":1,"pageNumber":1,
                      "excerpt":"Atomicity bảo đảm giao dịch hoàn thành toàn bộ hoặc không thực hiện."}] }]}}
                """.formatted(requestId, DOCUMENT_ID);
    }
}
