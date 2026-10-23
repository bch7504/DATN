package com.studyflow.integration.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import org.junit.jupiter.api.Test;

class AiDocumentUrlPolicyTest {
    @Test
    void acceptsProductionHttpsAndReturnsSameUri() {
        URI signedUrl = URI.create("https://storage.example.test/documents/file.pdf?signature=test");

        assertThat(AiDocumentUrlPolicy.requireAllowed(signedUrl, false)).isSameAs(signedUrl);
    }

    @Test
    void acceptsLoopbackHttpOnlyWithExplicitLocalOptIn() {
        URI signedUrl = URI.create("http://127.0.0.1:8333/documents/file.pdf?signature=test");

        assertThat(AiDocumentUrlPolicy.requireAllowed(signedUrl, true)).isSameAs(signedUrl);
        assertThatThrownBy(() -> AiDocumentUrlPolicy.requireAllowed(signedUrl, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsRemoteHttpEvenWhenLocalOptInIsEnabled() {
        URI signedUrl = URI.create("http://storage.example.test/documents/file.pdf");

        assertThatThrownBy(() -> AiDocumentUrlPolicy.requireAllowed(signedUrl, true))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
