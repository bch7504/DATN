package com.studyflow.integration.storage;

import java.io.IOException;
import java.io.InputStream;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/** S3-compatible implementation of private attachment storage. */
public class S3AssignmentAttachmentStorage implements AssignmentAttachmentStorage {
    private final S3Client client;
    private final String bucket;

    /** Args: configured S3 client and nonblank private bucket. Input: application storage settings. Output: adapter. Errors: none. */
    public S3AssignmentAttachmentStorage(S3Client client, String bucket) {
        this.client = client;
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
}
