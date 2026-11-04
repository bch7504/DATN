package com.studyflow.integration.document;

/** Server-side boundary for normalizing one Teacher PPTX upload into PDF bytes. */
public interface PresentationToPdfConverter {
    /**
     * Args: safe original PPTX filename and non-empty OOXML bytes, each required.
     * Input: authenticated Teacher upload already bounded by the public upload limit.
     * Output: non-empty PDF bytes; the caller still validates PDF signature, page count and text layer.
     * Errors: PresentationConversionException for unavailable, timed-out, rejected or oversized output.
     */
    byte[] convert(String originalFileName, byte[] pptxBytes);
}
