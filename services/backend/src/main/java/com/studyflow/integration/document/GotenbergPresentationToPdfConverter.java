package com.studyflow.integration.document;

import java.net.SocketTimeoutException;
import java.util.Locale;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** Gotenberg LibreOffice adapter. Provider response bodies are never exposed to callers. */
final class GotenbergPresentationToPdfConverter implements PresentationToPdfConverter {
    private static final MediaType PPTX = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.presentationml.presentation");

    private final RestClient client;
    private final long maxOutputBytes;

    /** Args: configured internal client and maximum PDF bytes. Errors: invalid dependency/limit. */
    GotenbergPresentationToPdfConverter(RestClient client, long maxOutputBytes) {
        this.client = java.util.Objects.requireNonNull(client, "client");
        if (maxOutputBytes < 1) throw new IllegalArgumentException("maxOutputBytes must be positive");
        this.maxOutputBytes = maxOutputBytes;
    }

    @Override
    public byte[] convert(String originalFileName, byte[] pptxBytes) {
        String safeName = originalFileName == null ? "" : originalFileName.trim();
        if (!safeName.toLowerCase(Locale.ROOT).endsWith(".pptx") || pptxBytes == null || pptxBytes.length == 0) {
            throw new IllegalArgumentException("A non-empty PPTX filename and body are required");
        }
        MultipartBodyBuilder form = new MultipartBodyBuilder();
        form.part("files", new NamedBytes(pptxBytes, safeName)).contentType(PPTX);
        try {
            byte[] output = client.post()
                    .uri("/forms/libreoffice/convert")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form.build())
                    .retrieve()
                    .body(byte[].class);
            if (output == null || output.length == 0) {
                throw new PresentationConversionException(
                        PresentationConversionException.Reason.FAILED,
                        "Presentation converter returned an empty PDF");
            }
            if (output.length > maxOutputBytes) {
                throw new PresentationConversionException(
                        PresentationConversionException.Reason.OUTPUT_TOO_LARGE,
                        "Converted PDF exceeds the configured output limit");
            }
            return output;
        } catch (PresentationConversionException exception) {
            throw exception;
        } catch (ResourceAccessException exception) {
            if (hasTimeoutCause(exception)) {
                throw new PresentationConversionException(
                        PresentationConversionException.Reason.TIMEOUT,
                        "Presentation conversion timed out");
            }
            throw new PresentationConversionException(
                    PresentationConversionException.Reason.UNAVAILABLE,
                    "Presentation converter is unavailable");
        } catch (RestClientResponseException exception) {
            throw new PresentationConversionException(
                    PresentationConversionException.Reason.FAILED,
                    "Presentation converter rejected the document");
        } catch (RuntimeException exception) {
            throw new PresentationConversionException(
                    PresentationConversionException.Reason.FAILED,
                    "Presentation conversion failed");
        }
    }

    private static boolean hasTimeoutCause(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof SocketTimeoutException
                    || current instanceof java.net.http.HttpTimeoutException) return true;
            current = current.getCause();
        }
        return false;
    }

    private static final class NamedBytes extends ByteArrayResource {
        private final String filename;

        private NamedBytes(byte[] bytes, String filename) {
            super(bytes);
            this.filename = filename;
        }

        @Override
        public String getFilename() { return filename; }
    }
}
