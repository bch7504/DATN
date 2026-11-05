package com.studyflow.integration.document;

import java.net.URI;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Creates the internal Gotenberg adapter only when explicitly enabled. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(PresentationConverterProperties.class)
public class PresentationConverterConfiguration {
    /**
     * Args: converter properties and Spring RestClient builder.
     * Input: absolute internal HTTP(S) URL, positive timeouts and bounded output size.
     * Output: PPTX-to-PDF converter. Errors: invalid deployment settings fail startup.
     */
    @Bean
    @ConditionalOnProperty(prefix = "studyflow.presentation-converter", name = "enabled", havingValue = "true")
    PresentationToPdfConverter presentationToPdfConverter(
            PresentationConverterProperties properties,
            RestClient.Builder builder
    ) {
        URI baseUrl = properties.baseUrl();
        if (baseUrl == null || !baseUrl.isAbsolute()
                || !("http".equalsIgnoreCase(baseUrl.getScheme()) || "https".equalsIgnoreCase(baseUrl.getScheme()))
                || baseUrl.getUserInfo() != null || baseUrl.getQuery() != null || baseUrl.getFragment() != null) {
            throw new IllegalStateException("PRESENTATION_CONVERTER_URL must be an absolute HTTP(S) URL without userinfo/query/fragment");
        }
        Duration connectTimeout = requirePositive(properties.connectTimeout(), "PRESENTATION_CONVERTER_CONNECT_TIMEOUT");
        Duration readTimeout = requirePositive(properties.readTimeout(), "PRESENTATION_CONVERTER_READ_TIMEOUT");
        if (properties.maxOutputBytes() < 1_048_576L || properties.maxOutputBytes() > 104_857_600L) {
            throw new IllegalStateException("PRESENTATION_CONVERTER_MAX_OUTPUT_BYTES must be between 1 MiB and 100 MiB");
        }
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        RestClient client = builder.baseUrl(baseUrl.toString()).requestFactory(requestFactory).build();
        return new GotenbergPresentationToPdfConverter(client, properties.maxOutputBytes());
    }

    private static Duration requirePositive(Duration value, String name) {
        if (value == null || value.isZero() || value.isNegative()) {
            throw new IllegalStateException(name + " must be positive");
        }
        return value;
    }
}
