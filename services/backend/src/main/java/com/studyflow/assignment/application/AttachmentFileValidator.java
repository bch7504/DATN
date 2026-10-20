package com.studyflow.assignment.application;

import com.studyflow.common.exception.ValidationException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Map;
import org.springframework.web.multipart.MultipartFile;

/** Server-side allowlist and signature validation for homework attachments. */
public final class AttachmentFileValidator {
    private static final Map<String, FileType> TYPES = Map.of(
            "pdf", new FileType("application/pdf", new byte[]{'%', 'P', 'D', 'F', '-'}),
            "png", new FileType("image/png", new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10}),
            "jpg", new FileType("image/jpeg", new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff}),
            "jpeg", new FileType("image/jpeg", new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff}),
            "docx", new FileType("application/vnd.openxmlformats-officedocument.wordprocessingml.document", new byte[]{'P', 'K', 3, 4}),
            "xlsx", new FileType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[]{'P', 'K', 3, 4}),
            "pptx", new FileType("application/vnd.openxmlformats-officedocument.presentationml.presentation", new byte[]{'P', 'K', 3, 4})
    );

    private AttachmentFileValidator() {}

    /**
     * Validates uploaded file metadata and leading signature.
     * Args: multipart file supplied in an authenticated request. Input: non-empty file up to 10 MiB.
     * Output: normalized filename, server-selected media type and exact size. Errors: IOException or 422 validation error.
     */
    public static ValidatedAttachment validate(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty() || file.getSize() > 10L * 1024 * 1024) {
            throw new ValidationException("INVALID_ATTACHMENT_SIZE", "Tệp đính kèm phải lớn hơn 0 và không vượt quá 10 MB.");
        }
        String suppliedName = file.getOriginalFilename();
        if (suppliedName == null || suppliedName.isBlank()) {
            throw new ValidationException("INVALID_ATTACHMENT_NAME", "Tên tệp đính kèm không hợp lệ.");
        }
        String baseName = suppliedName.replace('\\', '/');
        baseName = baseName.substring(baseName.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "_").trim();
        if (baseName.isBlank() || baseName.length() > 255) {
            throw new ValidationException("INVALID_ATTACHMENT_NAME", "Tên tệp đính kèm tối đa 255 ký tự.");
        }
        int dot = baseName.lastIndexOf('.');
        String extension = dot < 0 ? "" : baseName.substring(dot + 1).toLowerCase(Locale.ROOT);
        FileType type = TYPES.get(extension);
        if (type == null) throw new ValidationException("UNSUPPORTED_ATTACHMENT_TYPE", "Chỉ nhận PDF, PNG, JPG/JPEG, DOCX, XLSX hoặc PPTX.");
        byte[] header = new byte[type.signature().length];
        try (InputStream input = file.getInputStream()) {
            int read = input.readNBytes(header, 0, header.length);
            if (read != header.length || !startsWith(header, type.signature())) {
                throw new ValidationException("ATTACHMENT_SIGNATURE_MISMATCH", "Nội dung tệp không khớp với định dạng được khai báo.");
            }
        }
        return new ValidatedAttachment(baseName, type.contentType(), file.getSize());
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        for (int i = 0; i < prefix.length; i++) if (data[i] != prefix[i]) return false;
        return true;
    }

    private record FileType(String contentType, byte[] signature) {}
    public record ValidatedAttachment(String fileName, String contentType, long sizeBytes) {}
}
