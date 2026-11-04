package com.studyflow.integration.document;

import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Server-only Gotenberg settings; no converter URL is returned to a browser. */
@ConfigurationProperties(prefix = "studyflow.presentation-converter")
public record PresentationConverterProperties(
        boolean enabled,
        URI baseUrl,
        Duration connectTimeout,
        Duration readTimeout,
        long maxOutputBytes
) { }
