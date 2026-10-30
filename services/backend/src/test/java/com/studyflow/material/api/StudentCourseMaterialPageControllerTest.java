package com.studyflow.material.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.studyflow.common.api.GlobalExceptionHandler;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.material.application.CourseMaterialPageService;
import com.studyflow.material.application.CourseMaterialPageService.PageNote;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Synthetic HTTP contract cases for owner-scoped Course Material page actions. */
class StudentCourseMaterialPageControllerTest {
    private static final UUID STUDENT = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID DOCUMENT = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private CourseMaterialPageService pages;
    private MockMvc mvc;

    /** Args: none. Input: synthetic Student JWT and mocked service. Output: configured MVC; errors: setup failure. */
    @BeforeEach
    void setUp() {
        pages = mock(CourseMaterialPageService.class);
        Jwt jwt = Jwt.withTokenValue("synthetic").header("alg", "none").subject(STUDENT.toString()).build();
        HandlerMethodArgumentResolver resolver = new HandlerMethodArgumentResolver() {
            /** Args: method parameter. Output: true only for Jwt principal. Errors: none. */
            @Override public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
                        && parameter.getParameterType() == Jwt.class;
            }
            /** Args: MVC invocation context. Output: synthetic Jwt. Errors: none. */
            @Override public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                    NativeWebRequest request, WebDataBinderFactory binderFactory) { return jwt; }
        };
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mvc = MockMvcBuilders.standaloneSetup(new StudentCourseMaterialPageController(pages))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper))
                .setCustomArgumentResolvers(resolver).build();
    }

    /** Args: none. Input: existing synthetic page note. Output: 200 with typed note fields. Errors: assertion failure. */
    @Test
    void readsSavedNoteWithDocumentPageAndTimestamp() throws Exception {
        when(pages.readNote(STUDENT, DOCUMENT, 3))
                .thenReturn(new PageNote(DOCUMENT, 3, "Ghi chú thử", Instant.parse("2026-10-20T01:00:00Z")));
        mvc.perform(get("/api/v1/student/materials/{id}/pages/3/note", DOCUMENT))
                .andExpect(status().isOk()).andExpect(jsonPath("$.documentId").value(DOCUMENT.toString()))
                .andExpect(jsonPath("$.pageNumber").value(3))
                .andExpect(jsonPath("$.content").value("Ghi chú thử"))
                .andExpect(jsonPath("$.updatedAt").value("2026-10-20T01:00:00Z"));
    }

    /** Args: none. Input: malformed content rejected by service. Output: 422 error envelope. Errors: assertion failure. */
    @Test
    void invalidNoteReturnsValidationEnvelope() throws Exception {
        when(pages.saveNote(STUDENT, DOCUMENT, 3, "bad"))
                .thenThrow(new ValidationException("INVALID_NOTE", "Ghi chú không hợp lệ."));
        mvc.perform(put("/api/v1/student/materials/{id}/pages/3/note", DOCUMENT)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"bad\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_NOTE"));
    }

    /** Args: none. Input: view event with idempotency header. Output: 204, service receives scoped IDs. Errors: assertion failure. */
    @Test
    void recordsAuthorizedViewWithoutClientChosenEventType() throws Exception {
        mvc.perform(post("/api/v1/student/materials/{id}/pages/3/view-events", DOCUMENT)
                        .header("Idempotency-Key", "synthetic-page-view"))
                .andExpect(status().isNoContent());
        verify(pages).recordView(STUDENT, DOCUMENT, 3, "synthetic-page-view");
    }
}
