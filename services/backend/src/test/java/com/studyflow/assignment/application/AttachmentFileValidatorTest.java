package com.studyflow.assignment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.studyflow.common.exception.ValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class AttachmentFileValidatorTest {
    @Test
    void acceptsPngBySignatureAndDoesNotTrustClientMime() throws Exception {
        byte[] pngHeader = new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0};
        MockMultipartFile file = new MockMultipartFile("files", "../week1.png", "text/plain", pngHeader);

        AttachmentFileValidator.ValidatedAttachment validated = AttachmentFileValidator.validate(file);

        assertThat(validated.fileName()).isEqualTo("week1.png");
        assertThat(validated.contentType()).isEqualTo("image/png");
    }

    @Test
    void rejectsSpoofedExtension() {
        MockMultipartFile file = new MockMultipartFile("files", "malware.pdf", "application/pdf", "not a pdf".getBytes());

        assertThatThrownBy(() -> AttachmentFileValidator.validate(file))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void rejectsUnsupportedExtension() {
        MockMultipartFile file = new MockMultipartFile("files", "script.exe", "application/octet-stream", new byte[]{1});

        assertThatThrownBy(() -> AttachmentFileValidator.validate(file))
                .isInstanceOf(ValidationException.class);
    }
}
