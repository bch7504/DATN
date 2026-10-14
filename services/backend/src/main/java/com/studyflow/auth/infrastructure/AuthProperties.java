package com.studyflow.auth.infrastructure;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "studyflow.auth")
public record AuthProperties(
        @NotBlank String allowedEmailDomain,
        @NotNull Duration otpTtl,
        @NotNull Duration resendCooldown,
        @Min(1) @Max(10) int maxVerificationAttempts,
        @NotNull Duration accessTokenTtl,
        @NotNull Duration refreshTokenTtl,
        @NotBlank String jwtIssuer,
        @NotBlank String jwtSecret,
        boolean cookieSecure,
        @NotBlank String mailFrom
) {
}
