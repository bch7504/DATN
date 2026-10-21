package com.studyflow.integration.ai;

import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Server-only AI integration settings; the service token is never sent to the browser. */
@ConfigurationProperties(prefix = "studyflow.ai")
public record AiServiceProperties(
        boolean enabled,
        URI baseUrl,
        String serviceToken,
        Duration connectTimeout,
        Duration readTimeout
) { }
