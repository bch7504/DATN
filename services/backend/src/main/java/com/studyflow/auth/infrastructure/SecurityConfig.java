package com.studyflow.auth.infrastructure;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.user.domain.UserStatus;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class SecurityConfig {

    /**
     * Args: framework security builder, JWT/session adapters, error handlers and configured CORS source.
     * Input: trusted server configuration. Output: stateless API filter chain; no authorization bypass
     * for actual requests. Errors: Spring configuration exceptions fail startup.
     */
    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            BearerTokenResolver tokenResolver,
            JwtAuthenticationConverter jwtAuthenticationConverter,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler,
            CorsConfigurationSource corsConfigurationSource
    ) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/v1/auth/**", "/actuator/health").permitAll()
                        .requestMatchers("/api/v1/catalog/**").permitAll()
                        .requestMatchers("/api/v1/student/**").hasRole("STUDENT")
                        .requestMatchers(
                                "/api/v1/study-plans/**",
                                "/api/v1/study-plan-items/**",
                                "/api/v1/calendar"
                        ).hasRole("STUDENT")
                        .requestMatchers("/api/v1/teacher/**").hasRole("TEACHER")
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .oauth2ResourceServer(resource -> resource
                        .bearerTokenResolver(tokenResolver)
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)))
                .build();
    }

    /**
     * Args: optional comma-separated exact frontend origins; empty means no cross-origin access.
     * Input: server-only studyflow.cors.allowed-origins. Output: credentialed API CORS policy,
     * allowing preflight but retaining authentication/RBAC on actual requests.
     * Errors: wildcard origins with credentials fail startup. No browser-supplied origin is trusted implicitly.
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${studyflow.cors.allowed-origins:}") String configuredOrigins) {
        CorsConfiguration policy = new CorsConfiguration();
        policy.setAllowedOrigins(Arrays.stream(configuredOrigins.split(","))
                .map(String::trim).filter(origin -> !origin.isEmpty()).toList());
        policy.setAllowCredentials(true);
        policy.validateAllowCredentials();
        policy.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        policy.setAllowedHeaders(List.of("Content-Type", "Authorization", "Idempotency-Key", "X-Request-Id"));
        policy.setExposedHeaders(List.of("Content-Disposition", "X-Request-Id"));
        policy.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/v1/**", policy);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecretKey jwtSecretKey(AuthProperties properties) {
        byte[] bytes = properties.jwtSecret().getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey secretKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey));
    }

    @Bean
    /** Args: signing key, issuer policy and current account store. Input: signed access JWT.
     * Output: decoder enforcing signature, time, issuer and live account role/status.
     * Errors: invalid/old-role/locked tokens become authentication failures; DB failures propagate closed. */
    JwtDecoder jwtDecoder(SecretKey secretKey, AuthProperties properties, UserAccountStore users) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        OAuth2TokenValidator<Jwt> currentAccount = token -> {
            UUID id;
            try { id = UUID.fromString(token.getSubject()); }
            catch (RuntimeException exception) { return invalidAccountToken(); }
            String role = token.getClaimAsString("role");
            return users.findById(id).filter(account -> account.status() == UserStatus.ACTIVE
                            && account.role().name().equals(role))
                    .map(account -> OAuth2TokenValidatorResult.success())
                    .orElseGet(SecurityConfig::invalidAccountToken);
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(properties.jwtIssuer()), currentAccount));
        return decoder;
    }

    /** Args: none. Output: standard invalid-token result without account details. Errors: none. */
    private static OAuth2TokenValidatorResult invalidAccountToken() {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Account unavailable", null));
    }

    /**
     * Maps the single trusted JWT role claim to Spring's ROLE_* authority convention.
     *
     * @return converter producing authenticated principals with exactly the token's application role
     */
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthoritiesClaimName("role");
        authoritiesConverter.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter authenticationConverter = new JwtAuthenticationConverter();
        authenticationConverter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
        return authenticationConverter;
    }

    @Bean
    BearerTokenResolver bearerTokenResolver() {
        DefaultBearerTokenResolver defaultResolver = new DefaultBearerTokenResolver();
        return request -> {
            String token = defaultResolver.resolve(request);
            if (token != null) {
                return token;
            }
            return request.getCookies() == null
                    ? null
                    : Arrays.stream(request.getCookies())
                            .filter(cookie -> "SF_ACCESS".equals(cookie.getName()))
                            .map(Cookie::getValue)
                            .findFirst()
                            .orElse(null);
        };
    }
}
