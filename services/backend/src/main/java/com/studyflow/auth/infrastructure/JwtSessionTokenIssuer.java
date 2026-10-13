package com.studyflow.auth.infrastructure;

import com.studyflow.auth.application.SessionTokens;
import com.studyflow.auth.application.port.SessionTokenIssuer;
import com.studyflow.user.domain.UserAccount;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Component;

@Component
public final class JwtSessionTokenIssuer implements SessionTokenIssuer {

    private final JwtEncoder jwtEncoder;
    private final AuthProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public JwtSessionTokenIssuer(JwtEncoder jwtEncoder, AuthProperties properties) {
        this.jwtEncoder = jwtEncoder;
        this.properties = properties;
    }

    @Override
    public SessionTokens issue(UserAccount user, Instant now) {
        Instant accessExpiresAt = now.plus(properties.accessTokenTtl());
        Instant refreshExpiresAt = now.plus(properties.refreshTokenTtl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.jwtIssuer())
                .issuedAt(now)
                .expiresAt(accessExpiresAt)
                .subject(user.id().toString())
                .claim("role", user.role().name())
                .claim("email", user.email())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String accessToken = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        byte[] refreshBytes = new byte[32];
        secureRandom.nextBytes(refreshBytes);
        String refreshToken = Base64.getUrlEncoder().withoutPadding().encodeToString(refreshBytes);
        return new SessionTokens(accessToken, accessExpiresAt, refreshToken, refreshExpiresAt);
    }

    @Override
    public String hashRefreshToken(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 must be provided by the JVM", exception);
        }
    }
}
