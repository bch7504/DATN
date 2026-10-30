package com.studyflow.admin.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.studyflow.admin.application.AdminService;
import com.studyflow.common.api.GlobalExceptionHandler;
import com.studyflow.common.exception.ValidationException;
import java.time.Instant;
import java.util.List;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Synthetic HTTP contract checks for Admin request and response schemas. */
class AdminControllerTest {
    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private AdminService service;
    private MockMvc mvc;

    /** Args: none. Input: synthetic Admin principal and mocked application service. Output: MVC. Errors: setup failure. */
    @BeforeEach
    void setUp() {
        service = mock(AdminService.class);
        Jwt jwt = Jwt.withTokenValue("synthetic").header("alg", "none").subject(ADMIN.toString()).build();
        HandlerMethodArgumentResolver resolver = new HandlerMethodArgumentResolver() {
            /** Args: method parameter. Output: true for JWT principal. Errors: none. */
            @Override public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
                        && parameter.getParameterType() == Jwt.class;
            }
            /** Args: invocation context. Output: synthetic Admin JWT. Errors: none. */
            @Override public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                    NativeWebRequest request, WebDataBinderFactory binderFactory) { return jwt; }
        };
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mvc = MockMvcBuilders.standaloneSetup(new AdminController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper))
                .setCustomArgumentResolvers(resolver).build();
    }

    /** Args: none. Input: one synthetic safe account. Output: 200 bounded page schema. Errors: assertion failure. */
    @Test
    void usersReturnTypedPageWithoutPrivateFields() throws Exception {
        AdminModels.User user = new AdminModels.User(ADMIN, "admin@ptit.edu.vn", "admin", "Admin",
                "ADMIN", "ACTIVE", Instant.parse("2026-10-20T01:00:00Z"));
        when(service.users(null, null, 0, 20)).thenReturn(new AdminModels.Page<>(List.of(user), 0, 20, 1, 1));
        mvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].role").value("ADMIN"))
                .andExpect(jsonPath("$.items[0].passwordHash").doesNotExist());
    }

    /** Args: none. Input: valid Subject body. Output: 201 typed Subject; authenticated actor passed. Errors: assertion failure. */
    @Test
    void createsSubjectWithTypedResult() throws Exception {
        UUID id = UUID.fromString("22222222-2222-2222-2222-222222222222");
        when(service.createSubject(eq(ADMIN), any(AdminModels.SubjectInput.class), any()))
                .thenReturn(new AdminModels.Subject(id, "INT101", "Lập trình", 3, null, "ACTIVE"));
        mvc.perform(post("/api/v1/admin/subjects").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"INT101\",\"name\":\"Lập trình\",\"credits\":3}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.credits").value(3));
        verify(service).createSubject(eq(ADMIN), any(AdminModels.SubjectInput.class), any());
    }

    /** Args: none. Input: missing settings flag rejected by application service. Output: 422 envelope. Errors: assertion failure. */
    @Test
    void invalidSettingsReturnContractError() throws Exception {
        when(service.updateSettings(eq(ADMIN), any(AdminModels.SettingsUpdate.class), any()))
                .thenThrow(new ValidationException("INVALID_SETTING", "Thiếu cấu hình."));
        mvc.perform(patch("/api/v1/admin/system-settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_SETTING"));
    }
}
