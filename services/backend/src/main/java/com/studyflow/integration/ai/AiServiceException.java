package com.studyflow.integration.ai;

/** Safe failure returned by or encountered while calling the Python AI service. */
public final class AiServiceException extends RuntimeException {
    private final int statusCode;
    private final String code;
    private final String requestId;

    /**
     * Args: downstream HTTP status (or 503 for transport failure), safe code/message and trace ID.
     * Input: sanitized values only. Output: exception instance. Errors: none.
     */
    public AiServiceException(int statusCode, String code, String message, String requestId, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.code = code;
        this.requestId = requestId;
    }

    public int statusCode() { return statusCode; }
    public String code() { return code; }
    public String requestId() { return requestId; }
}
