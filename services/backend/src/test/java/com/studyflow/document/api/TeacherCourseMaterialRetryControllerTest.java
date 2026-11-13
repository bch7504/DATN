package com.studyflow.document.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.studyflow.common.exception.ApiException;
import com.studyflow.document.application.CourseMaterialLibraryService;
import com.studyflow.document.application.TeacherCourseMaterialDeletionService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;

/** Public retry handler contracts using only synthetic identities and mocked infrastructure. */
class TeacherCourseMaterialRetryControllerTest {
    private final CourseMaterialLibraryService materials = mock(CourseMaterialLibraryService.class);
    private final TeacherCourseMaterialController controller = new TeacherCourseMaterialController(
            materials, mock(TeacherCourseMaterialDeletionService.class));

    /** The retired source-writing method returns a public 405 envelope instead of a server error. */
    @Test
    void sourceConfigurationIsReadOnly() throws Exception {
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new com.studyflow.common.api.GlobalExceptionHandler()).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/v1/teacher/documents/{id}/supporting-sources", UUID.randomUUID())
                        .contentType("application/json").content("{}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isMethodNotAllowed())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string(
                        "Allow", org.hamcrest.Matchers.containsString("GET")))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.code").value("METHOD_NOT_ALLOWED"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.traceId").isString())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.details").isArray());
    }

    /** Valid authenticated input produces exactly HTTP 204 and forwards the owner identity. */
    @Test
    void returnsNoContentAfterRetry() {
        UUID teacherId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("synthetic-only").header("alg", "HS256")
                .subject(teacherId.toString()).build();

        var response = controller.retryIndexing(jwt, documentId);

        assertEquals(204, response.getStatusCode().value());
        assertEquals(null, response.getBody());
        verify(materials).retryIndexing(teacherId, documentId);
    }

    /** Missing authentication fails before a document retry is requested. */
    @Test
    void rejectsMissingIdentity() {
        ApiException error = assertThrows(ApiException.class,
                () -> controller.retryIndexing(null, UUID.randomUUID()));

        assertEquals(401, error.status().value());
    }

    /** State errors propagate using the standard Java error contract. */
    @Test
    void propagatesRetryNotAllowed() {
        UUID teacherId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("synthetic-only").header("alg", "HS256")
                .subject(teacherId.toString()).build();
        doThrow(new ApiException(HttpStatus.CONFLICT, "INDEX_RETRY_NOT_ALLOWED", "Synthetic failure"))
                .when(materials).retryIndexing(teacherId, documentId);

        ApiException error = assertThrows(ApiException.class,
                () -> controller.retryIndexing(jwt, documentId));

        assertEquals(409, error.status().value());
        assertEquals("INDEX_RETRY_NOT_ALLOWED", error.code());
    }
}
