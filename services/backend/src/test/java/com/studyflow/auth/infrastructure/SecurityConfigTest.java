package com.studyflow.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class SecurityConfigTest {

    @Test
    void jwtRoleClaimMapsToSpringRoleAuthority() {
        Jwt token = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject("4a754e8d-70ae-4ba9-af24-85d4e5506e65")
                .issuedAt(Instant.parse("2026-10-13T09:00:00Z"))
                .expiresAt(Instant.parse("2026-10-13T09:15:00Z"))
                .claim("role", "TEACHER")
                .build();

        var authentication = new SecurityConfig().jwtAuthenticationConverter().convert(token);

        assertThat(authentication).isNotNull();
        assertThat(authentication.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_TEACHER");
    }
}
