package com.studyflow.integration.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Creates the internal AI client only when deployment explicitly enables it. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AiServiceProperties.class)
public class AiServiceConfiguration {
    /**
     * Args: server-only AI properties, Boot RestClient builder and ObjectMapper.
     * Input: an absolute HTTP(S) base URL, token of at least 16 characters and positive timeouts.
     * Output: schema-v3 AI gateway. Errors: invalid configuration fails startup when integration is enabled.
     */
    @Bean
    @ConditionalOnProperty(prefix = "studyflow.ai", name = "enabled", havingValue = "true")
    AiServiceClient aiServiceClient(
            AiServiceProperties properties,
            RestClient.Builder builder,
            ObjectMapper objectMapper
    ) {
        URI baseUrl = properties.baseUrl();
        if (baseUrl == null || !baseUrl.isAbsolute()
                || !("http".equalsIgnoreCase(baseUrl.getScheme()) || "https".equalsIgnoreCase(baseUrl.getScheme()))
                || baseUrl.getUserInfo() != null || baseUrl.getQuery() != null || baseUrl.getFragment() != null) {
            throw new IllegalStateException("AI_SERVICE_URL must be an absolute HTTP(S) URL without userinfo/query/fragment");
        }
        String token = properties.serviceToken() == null ? "" : properties.serviceToken().trim();
        if (token.length() < 16) throw new IllegalStateException("AI_SERVICE_TOKEN must contain at least 16 characters");
        Duration connectTimeout = requirePositive(properties.connectTimeout(), "AI_CONNECT_TIMEOUT");
        Duration readTimeout = requirePositive(properties.readTimeout(), "AI_READ_TIMEOUT");
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        RestClient restClient = builder.baseUrl(baseUrl.toString())
                .requestFactory(requestFactory)
                .build();
        return new HttpAiServiceClient(restClient, objectMapper, token);
    }

    private static Duration requirePositive(Duration value, String name) {
        if (value == null || value.isZero() || value.isNegative()) {
            throw new IllegalStateException(name + " must be positive");
        }
        return value;
    }
}
