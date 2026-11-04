package com.studyflow.integration.document;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** Contract tests for the internal Gotenberg HTTP boundary; all payloads are synthetic. */
class GotenbergPresentationToPdfConverterTest {
    private MockRestServiceServer server;
    private RestClient client;

    /** Args: none. Input: synthetic HTTP server. Output: initialized client; errors fail the test. */
    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://converter.test");
        server = MockRestServiceServer.bindTo(builder).build();
        client = builder.build();
    }

    /** A successful LibreOffice response is returned unchanged for Java's PDF validation stage. */
    @Test
    void returnsConvertedPdfBytes() {
        byte[] pdf = "%PDF-synthetic".getBytes(StandardCharsets.US_ASCII);
        server.expect(requestTo("http://converter.test/forms/libreoffice/convert"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(pdf, MediaType.APPLICATION_PDF));

        byte[] actual = new GotenbergPresentationToPdfConverter(client, 1024)
                .convert("lesson.pptx", new byte[] {80, 75, 3, 4});

        assertArrayEquals(pdf, actual);
        server.verify();
    }

    /** Provider 5xx responses are mapped to a stable failure reason without leaking provider bodies. */
    @Test
    void mapsProviderFailureToStableReason() {
        server.expect(requestTo("http://converter.test/forms/libreoffice/convert"))
                .andRespond(withServerError());

        PresentationConversionException error = assertThrows(PresentationConversionException.class,
                () -> new GotenbergPresentationToPdfConverter(client, 1024)
                        .convert("lesson.pptx", new byte[] {80, 75, 3, 4}));

        assertEquals(PresentationConversionException.Reason.FAILED, error.reason());
        server.verify();
    }

    /** Oversized converted output is rejected before the service can persist it. */
    @Test
    void rejectsOutputAboveConfiguredLimit() {
        server.expect(requestTo("http://converter.test/forms/libreoffice/convert"))
                .andRespond(withSuccess(new byte[9], MediaType.APPLICATION_PDF));

        PresentationConversionException error = assertThrows(PresentationConversionException.class,
                () -> new GotenbergPresentationToPdfConverter(client, 8)
                        .convert("lesson.pptx", new byte[] {80, 75, 3, 4}));

        assertEquals(PresentationConversionException.Reason.OUTPUT_TOO_LARGE, error.reason());
        server.verify();
    }

    /** Invalid caller arguments fail locally and never create an internal HTTP request. */
    @Test
    void rejectsInvalidInputBeforeHttpCall() {
        GotenbergPresentationToPdfConverter converter =
                new GotenbergPresentationToPdfConverter(client, 1024);

        assertThrows(IllegalArgumentException.class, () -> converter.convert("lesson.pdf", new byte[] {1}));
        assertThrows(IllegalArgumentException.class, () -> converter.convert("lesson.pptx", new byte[0]));
        server.verify();
    }
}
