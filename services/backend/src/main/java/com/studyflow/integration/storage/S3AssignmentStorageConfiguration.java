package com.studyflow.integration.storage;

import java.net.URI;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;

@Configuration
@ConditionalOnProperty(prefix = "studyflow.storage", name = "enabled", havingValue = "true")
public class S3AssignmentStorageConfiguration {
    /**
     * Builds an S3-compatible client from server-only configuration.
     * Args: endpoint, region and credentials from STORAGE_* environment variables.
     * Input: deployment storage settings. Output: closeable S3Client bean.
     * Errors: invalid URI/region/credentials fail application startup; network errors occur at operation time.
     */
    @Bean(destroyMethod = "close")
    public S3Client assignmentS3Client(
            @Value("${studyflow.storage.endpoint}") String endpoint,
            @Value("${studyflow.storage.region}") String region,
            @Value("${studyflow.storage.access-key}") String accessKey,
            @Value("${studyflow.storage.secret-key}") String secretKey) {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .overrideConfiguration(ClientOverrideConfiguration.builder()
                        .apiCallAttemptTimeout(Duration.ofSeconds(30))
                        .apiCallTimeout(Duration.ofMinutes(2))
                        .build())
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
    }

    /**
     * Builds the matching server-side presigner used only for short-lived Python indexing URLs.
     * Args: storage endpoint, region and credentials. Input: same private bucket origin as S3Client.
     * Output: closeable S3Presigner. Errors: invalid deployment configuration fails startup.
     */
    @Bean(destroyMethod = "close")
    public S3Presigner assignmentS3Presigner(
            @Value("${studyflow.storage.endpoint}") String endpoint,
            @Value("${studyflow.storage.region}") String region,
            @Value("${studyflow.storage.access-key}") String accessKey,
            @Value("${studyflow.storage.secret-key}") String secretKey) {
        return S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    /** Wires the private S3 bucket adapter; bucket is never exposed to a client. */
    @Bean
    public AssignmentAttachmentStorage assignmentAttachmentStorage(
            S3Client assignmentS3Client,
            S3Presigner assignmentS3Presigner,
            @Value("${studyflow.storage.bucket}") String bucket) {
        return new S3AssignmentAttachmentStorage(assignmentS3Client, assignmentS3Presigner, bucket);
    }
}
