package com.studyflow.integration.storage;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

/** Private object-storage contract for assignment attachments; object keys never cross the public API. */
public interface AssignmentAttachmentStorage {
    /**
     * Stores one validated stream.
     * Args: generated objectKey, server-detected contentType, input stream and exact contentLength.
     * Input: non-empty stream within configured upload limit. Output: void. Errors: IOException or storage runtime failure.
     */
    void put(String objectKey, String contentType, InputStream input, long contentLength) throws IOException;

    /** Args: previously persisted object key. Input: private key from app metadata. Output: readable stream. Errors: storage runtime failure. */
    InputStream get(String objectKey);

    /** Args: previously persisted object key. Input: private key from app metadata. Output: void. Errors: storage runtime failure. */
    void delete(String objectKey);

    /**
     * Creates a short-lived private download URL for the Python indexing worker.
     * Args: persisted object key and positive validity duration. Input: server-owned private object.
     * Output: absolute signed URI. Errors: storage runtime failure or unsupported adapter.
     */
    default URI presignGet(String objectKey, Duration validity) {
        throw new UnsupportedOperationException("Signed downloads are not supported by this storage adapter");
    }
}
