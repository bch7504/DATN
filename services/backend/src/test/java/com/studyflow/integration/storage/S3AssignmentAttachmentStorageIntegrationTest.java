package com.studyflow.integration.storage;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.studyflow.integration.ai.AiDocumentUrlPolicy;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/** Opt-in smoke test for a real, local S3-compatible bucket using synthetic data only. */
@EnabledIfEnvironmentVariable(named = "STORAGE_INTEGRATION_TEST_ENABLED", matches = "true")
class S3AssignmentAttachmentStorageIntegrationTest {
    /**
     * Args: none. Input: STORAGE_* environment values and an existing private bucket.
     * Output: void; verifies SDK and signed-URL reads, then removes the synthetic object.
     * Errors: storage/authorization failures fail the test; cleanup always runs.
     */
    @Test
    void uploadsAndReadsSyntheticObject() throws Exception {
        S3AssignmentStorageConfiguration configuration = new S3AssignmentStorageConfiguration();
        String bucket = System.getenv("STORAGE_BUCKET");
        String key = "integration-tests/" + UUID.randomUUID() + ".txt";
        byte[] content = "studyflow-storage-smoke-test".getBytes(StandardCharsets.UTF_8);
        String endpoint = System.getenv("STORAGE_ENDPOINT");
        String region = System.getenv("STORAGE_REGION");
        String accessKey = System.getenv("STORAGE_ACCESS_KEY");
        String secretKey = System.getenv("STORAGE_SECRET_KEY");
        try (S3Client client = configuration.assignmentS3Client(endpoint, region, accessKey, secretKey);
                S3Presigner presigner = configuration.assignmentS3Presigner(
                        endpoint, region, accessKey, secretKey)) {
            AssignmentAttachmentStorage storage = new S3AssignmentAttachmentStorage(client, presigner, bucket);
            try {
                storage.put(key, "text/plain", new ByteArrayInputStream(content), content.length);
                try (InputStream downloaded = storage.get(key)) {
                    assertArrayEquals(content, downloaded.readAllBytes());
                }
                var signedUrl = AiDocumentUrlPolicy.requireAllowed(
                        storage.presignGet(key, Duration.ofMinutes(1)), true);
                HttpResponse<byte[]> response = HttpClient.newHttpClient().send(
                        HttpRequest.newBuilder(signedUrl).GET().build(),
                        HttpResponse.BodyHandlers.ofByteArray());
                assertEquals(200, response.statusCode());
                assertArrayEquals(content, response.body());
            } finally {
                storage.delete(key);
            }
        }
    }
}
