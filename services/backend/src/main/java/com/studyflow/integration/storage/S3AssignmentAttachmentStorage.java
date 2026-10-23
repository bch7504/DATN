package com.studyflow.integration.storage;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.Objects;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

/** S3-compatible implementation of private attachment storage. */
public class S3AssignmentAttachmentStorage implements AssignmentAttachmentStorage {
    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;

    /** Args: configured S3 client and nonblank private bucket. Input: application storage settings. Output: adapter. Errors: none. */
    public S3AssignmentAttachmentStorage(S3Client client, String bucket) {
        this(client, null, bucket);
    }

    /**
     * Args: configured S3 client, optional presigner and nonblank private bucket.
     * Input: application storage settings. Output: reusable private storage adapter.
     * Errors: NullPointerException/IllegalArgumentException for invalid configuration.
     */
    public S3AssignmentAttachmentStorage(S3Client client, S3Presigner presigner, String bucket) {
        this.client = Objects.requireNonNull(client, "client");
        this.presigner = presigner;
        if (bucket == null || bucket.isBlank()) throw new IllegalArgumentException("bucket must not be blank");
        this.bucket = bucket;
    }

    @Override
    public void put(String objectKey, String contentType, InputStream input, long contentLength) throws IOException {
        client.putObject(PutObjectRequest.builder().bucket(bucket).key(objectKey)
                        .contentType(contentType).contentDisposition("attachment").build(),
                RequestBody.fromInputStream(input, contentLength));
    }

    @Override
    public InputStream get(String objectKey) {
        ResponseInputStream<GetObjectResponse> response = client.getObject(
                GetObjectRequest.builder().bucket(bucket).key(objectKey).build());
        return response;
    }

    @Override
    public void delete(String objectKey) {
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(objectKey).build());
    }

    @Override
    public URI presignGet(String objectKey, Duration validity) {
        if (presigner == null) {
            throw new UnsupportedOperationException("S3 presigner is not configured");
        }
        if (objectKey == null || objectKey.isBlank()) throw new IllegalArgumentException("objectKey must not be blank");
        if (validity == null || validity.isZero() || validity.isNegative() || validity.compareTo(Duration.ofHours(1)) > 0) {
            throw new IllegalArgumentException("validity must be between 1 second and 1 hour");
        }
        GetObjectRequest request = GetObjectRequest.builder().bucket(bucket).key(objectKey).build();
        return URI.create(presigner.presignGetObject(GetObjectPresignRequest.builder()
                        .signatureDuration(validity)
                        .getObjectRequest(request)
                        .build())
                .url().toExternalForm());
    }
}
