package com.studyflow.integration.storage;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import software.amazon.awssdk.services.s3.S3Client;

/** Opt-in smoke test for a real, local S3-compatible bucket using synthetic data only. */
@EnabledIfEnvironmentVariable(named = "STORAGE_INTEGRATION_TEST_ENABLED", matches = "true")
class S3AssignmentAttachmentStorageIntegrationTest {
    /**
     * Args: none. Input: STORAGE_* environment values and an existing private bucket.
     * Output: void; verifies uploaded bytes and removes the synthetic object.
     * Errors: storage/authorization failures fail the test; cleanup always runs.
     */
    @Test
    void uploadsAndReadsSyntheticObject() throws Exception {
        S3AssignmentStorageConfiguration configuration = new S3AssignmentStorageConfiguration();
        String bucket = System.getenv("STORAGE_BUCKET");
        String key = "integration-tests/" + UUID.randomUUID() + ".txt";
        byte[] content = "studyflow-storage-smoke-test".getBytes(StandardCharsets.UTF_8);
        try (S3Client client = configuration.assignmentS3Client(
                System.getenv("STORAGE_ENDPOINT"), System.getenv("STORAGE_REGION"),
                System.getenv("STORAGE_ACCESS_KEY"), System.getenv("STORAGE_SECRET_KEY"))) {
            AssignmentAttachmentStorage storage = new S3AssignmentAttachmentStorage(client, bucket);
            try {
                storage.put(key, "text/plain", new ByteArrayInputStream(content), content.length);
                try (InputStream downloaded = storage.get(key)) {
                    assertArrayEquals(content, downloaded.readAllBytes());
                }
            } finally {
                storage.delete(key);
            }
        }
    }
}
