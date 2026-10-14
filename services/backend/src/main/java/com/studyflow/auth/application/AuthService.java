package com.studyflow.auth.application;

import com.studyflow.auth.application.port.RefreshSessionStore;
import com.studyflow.auth.application.port.RegistrationChallengeStore;
import com.studyflow.auth.application.port.SecretHasher;
import com.studyflow.auth.application.port.SessionTokenIssuer;
import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.auth.application.port.VerificationCodeSender;
import com.studyflow.auth.domain.RefreshSession;
import com.studyflow.auth.domain.RegistrationChallenge;
import com.studyflow.auth.infrastructure.AuthProperties;
import com.studyflow.auth.infrastructure.VerificationCodeGenerator;
import com.studyflow.common.exception.ApiException;
import com.studyflow.user.domain.UserAccount;
import com.studyflow.user.domain.UserStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserAccountStore users;
    private final RegistrationChallengeStore challenges;
    private final RefreshSessionStore refreshSessions;
    private final VerificationCodeSender verificationCodeSender;
    private final SecretHasher secretHasher;
    private final SessionTokenIssuer tokenIssuer;
    private final VerificationCodeGenerator codeGenerator;
    private final AuthProperties properties;
    private final Clock clock;

    public AuthService(
            UserAccountStore users,
            RegistrationChallengeStore challenges,
            RefreshSessionStore refreshSessions,
            VerificationCodeSender verificationCodeSender,
            SecretHasher secretHasher,
            SessionTokenIssuer tokenIssuer,
            VerificationCodeGenerator codeGenerator,
            AuthProperties properties,
            Clock clock
    ) {
        this.users = users;
        this.challenges = challenges;
        this.refreshSessions = refreshSessions;
        this.verificationCodeSender = verificationCodeSender;
        this.secretHasher = secretHasher;
        this.tokenIssuer = tokenIssuer;
        this.codeGenerator = codeGenerator;
        this.properties = properties;
        this.clock = clock;
    }

    /**
     * Starts public Student registration.
     *
     * @param command required display name, PTIT email and raw password from the public request
     * @return verification expiry and resend timing; the account is not created yet
     * @throws ApiException when the email domain is not allowed, an account already exists, or resend is throttled
     * Side effect: stores only password/code hashes and sends one OTP to the normalized email address.
     */
    @Transactional
    public RegistrationStatus startRegistration(StartRegistrationCommand command) {
        Instant now = clock.instant();
        String email = normalizeAndValidatePtitEmail(command.email());
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_ALREADY_EXISTS", "Email đã được đăng ký");
        }

        RegistrationChallenge existing = challenges.findByEmailForUpdate(email).orElse(null);
        if (existing != null && !existing.isConsumed() && now.isBefore(existing.resendAvailableAt())) {
            throw new ApiException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "VERIFICATION_RESEND_TOO_SOON",
                    "Vui lòng chờ trước khi yêu cầu mã xác minh mới"
            );
        }

        String code = codeGenerator.generate();
        String passwordHash = secretHasher.hash(command.password());
        String codeHash = secretHasher.hash(code);
        String displayName = command.displayName().strip();
        RegistrationChallenge challenge = existing == null
                ? RegistrationChallenge.issue(
                        email,
                        displayName,
                        passwordHash,
                        codeHash,
                        now,
                        properties.otpTtl(),
                        properties.resendCooldown(),
                        properties.maxVerificationAttempts()
                )
                : existing.reissue(
                        displayName,
                        passwordHash,
                        codeHash,
                        now,
                        properties.otpTtl(),
                        properties.resendCooldown(),
                        properties.maxVerificationAttempts()
                );
        challenges.save(challenge);
        verificationCodeSender.send(email, displayName, code, challenge.expiresAt());
        return RegistrationStatus.verificationRequired(
                challenge.expiresAt(),
                challenge.resendAvailableAt()
        );
    }

    /**
     * Verifies a pending PTIT registration and creates the Student account atomically.
     *
     * @param command required PTIT email and six-digit verification code
     * @return void
     * @throws ApiException for a missing, expired, exhausted, consumed, or incorrect challenge
     * Side effect: creates one ACTIVE/STUDENT user and consumes the verification challenge.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public void verifyRegistration(VerifyRegistrationCommand command) {
        Instant now = clock.instant();
        String email = normalizeAndValidatePtitEmail(command.email());
        RegistrationChallenge challenge = challenges.findByEmailForUpdate(email)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "VERIFICATION_INVALID",
                        "Mã xác minh không hợp lệ"
                ));
        if (challenge.isConsumed()) {
            throw new ApiException(HttpStatus.CONFLICT, "VERIFICATION_ALREADY_USED", "Mã xác minh đã được sử dụng");
        }
        if (!challenge.expiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.GONE, "VERIFICATION_EXPIRED", "Mã xác minh đã hết hạn");
        }
        if (challenge.attemptsRemaining() <= 0) {
            throw new ApiException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "VERIFICATION_ATTEMPTS_EXHAUSTED",
                    "Đã vượt quá số lần nhập mã cho phép"
            );
        }
        if (!secretHasher.matches(command.verificationCode(), challenge.codeHash())) {
            challenges.save(challenge.failedAttempt(now));
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VERIFICATION_INVALID", "Mã xác minh không hợp lệ");
        }
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_ALREADY_EXISTS", "Email đã được đăng ký");
        }

        users.save(UserAccount.verifiedStudent(
                challenge.email(),
                challenge.passwordHash(),
                challenge.displayName(),
                now
        ));
        challenges.save(challenge.consume(now));
    }

    /**
     * Resends an OTP for an existing pending registration.
     *
     * @param email required PTIT email from the public request
     * @return new verification expiry and resend timing
     * @throws ApiException when no pending registration exists or cooldown is active
     * Side effect: invalidates the previous OTP and sends a new code.
     */
    @Transactional
    public RegistrationStatus resendVerification(String email) {
        Instant now = clock.instant();
        String normalized = normalizeAndValidatePtitEmail(email);
        RegistrationChallenge existing = challenges.findByEmailForUpdate(normalized)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "REGISTRATION_NOT_PENDING",
                        "Không có yêu cầu đăng ký đang chờ xác minh"
                ));
        if (users.existsByEmail(normalized) || existing.isConsumed()) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_ALREADY_EXISTS", "Email đã được đăng ký");
        }
        if (now.isBefore(existing.resendAvailableAt())) {
            throw new ApiException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "VERIFICATION_RESEND_TOO_SOON",
                    "Vui lòng chờ trước khi yêu cầu mã xác minh mới"
            );
        }

        String code = codeGenerator.generate();
        RegistrationChallenge updated = existing.reissue(
                existing.displayName(),
                existing.passwordHash(),
                secretHasher.hash(code),
                now,
                properties.otpTtl(),
                properties.resendCooldown(),
                properties.maxVerificationAttempts()
        );
        challenges.save(updated);
        verificationCodeSender.send(normalized, updated.displayName(), code, updated.expiresAt());
        return RegistrationStatus.verificationRequired(updated.expiresAt(), updated.resendAvailableAt());
    }

    /**
     * Authenticates an active user and creates a refresh session.
     *
     * @param command required email/username identifier and raw password
     * @return raw access/refresh tokens for the controller to place only in HttpOnly cookies
     * @throws ApiException with a non-enumerating error for invalid credentials, or 403 for locked accounts
     * Side effect: persists only the SHA-256 hash of the refresh token.
     */
    @Transactional
    public SessionTokens login(LoginCommand command) {
        Instant now = clock.instant();
        String identifier = command.identifier().strip().toLowerCase(Locale.ROOT);
        UserAccount user = users.findByIdentifier(identifier)
                .filter(candidate -> secretHasher.matches(command.password(), candidate.passwordHash()))
                .orElseThrow(AuthService::invalidCredentials);
        if (user.status() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa");
        }
        return issueAndStoreSession(user, now);
    }

    /**
     * Rotates a valid refresh token and detects reuse of revoked tokens.
     *
     * @param rawRefreshToken required raw cookie value; never persisted or logged
     * @return replacement access/refresh token pair
     * @throws ApiException when the token is missing, expired, revoked, or does not map to an active user
     * Side effect: revokes the previous session and stores the replacement hash.
     */
    @Transactional
    public SessionTokens refresh(String rawRefreshToken) {
        Instant now = clock.instant();
        String hash = tokenIssuer.hashRefreshToken(requireToken(rawRefreshToken));
        RefreshSession previous = refreshSessions.findByTokenHashForUpdate(hash)
                .orElseThrow(AuthService::invalidSession);
        if (!previous.canRotateAt(now)) {
            throw invalidSession();
        }
        UserAccount user = users.findById(previous.userId())
                .filter(candidate -> candidate.status() == UserStatus.ACTIVE)
                .orElseThrow(AuthService::invalidSession);
        SessionTokens tokens = tokenIssuer.issue(user, now);
        RefreshSession replacement = RefreshSession.active(
                user.id(),
                tokenIssuer.hashRefreshToken(tokens.refreshToken()),
                tokens.refreshTokenExpiresAt(),
                now
        );
        refreshSessions.save(replacement);
        refreshSessions.save(previous.revoke(now, replacement.id()));
        return tokens;
    }

    /**
     * Revokes a refresh token if it exists; repeated logout remains successful.
     *
     * @param rawRefreshToken optional cookie value
     * @return void
     * Side effect: marks the matching refresh session revoked; unknown tokens are ignored.
     */
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        Instant now = clock.instant();
        String hash = tokenIssuer.hashRefreshToken(rawRefreshToken);
        refreshSessions.findByTokenHashForUpdate(hash)
                .filter(session -> session.revokedAt() == null)
                .ifPresent(session -> refreshSessions.save(session.revoke(now, null)));
    }

    private SessionTokens issueAndStoreSession(UserAccount user, Instant now) {
        SessionTokens tokens = tokenIssuer.issue(user, now);
        refreshSessions.save(RefreshSession.active(
                user.id(),
                tokenIssuer.hashRefreshToken(tokens.refreshToken()),
                tokens.refreshTokenExpiresAt(),
                now
        ));
        return tokens;
    }

    private String normalizeAndValidatePtitEmail(String rawEmail) {
        String email = rawEmail.strip().toLowerCase(Locale.ROOT);
        int separator = email.lastIndexOf('@');
        String domain = separator < 0 ? "" : email.substring(separator + 1);
        if (!domain.equals(properties.allowedEmailDomain().toLowerCase(Locale.ROOT))) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "EMAIL_DOMAIN_NOT_ALLOWED",
                    "Chỉ chấp nhận email @" + properties.allowedEmailDomain()
            );
        }
        return email;
    }

    private static String requireToken(String token) {
        if (token == null || token.isBlank()) {
            throw invalidSession();
        }
        return token;
    }

    private static ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Thông tin đăng nhập không hợp lệ");
    }

    private static ApiException invalidSession() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Phiên đăng nhập không hợp lệ");
    }
}
