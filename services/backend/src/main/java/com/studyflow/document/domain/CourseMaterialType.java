package com.studyflow.document.domain;

/** Public Course Material behavior while the physical file remains a text-layer PDF. */
public enum CourseMaterialType {
    SLIDE_PDF,
    REFERENCE_PDF;

    /**
     * Args: raw required upload value.
     * Input: public multipart materialType field.
     * Output: one supported CourseMaterialType.
     * Errors: IllegalArgumentException when missing or unsupported; caller maps it to validation error.
     */
    public static CourseMaterialType parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("materialType is required");
        }
        return CourseMaterialType.valueOf(raw.trim().toUpperCase(java.util.Locale.ROOT));
    }
}
