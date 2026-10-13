package com.studyflow.auth.application;

import com.studyflow.auth.dto.AuthResponse;
import com.studyflow.auth.dto.LoginRequest;
import com.studyflow.auth.dto.RegisterRequest;
import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ForbiddenException;
import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.common.security.JwtTokenProvider;
import com.studyflow.common.security.UserRole;
import com.studyflow.user.domain.User;
import com.studyflow.user.domain.UserRepository;
import com.studyflow.user.dto.UserSummaryDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Application service managing authentication, session issuance, and student registration.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * Authenticates a user using email or username and raw password.
     *
     * Contract:
     * - args: request (LoginRequest, required)
     * - input: identifier (email or username), password
     * - output: AuthResponse containing JWT accessToken and UserSummaryDto
     * - errors:
     *     - ValidationException: INVALID_CREDENTIALS
     *     - ForbiddenException: USER_INACTIVE
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getIdentifier().trim();
        Optional<User> userOpt = identifier.contains("@")
                ? userRepository.findByEmail(identifier)
                : userRepository.findByUsername(identifier);

        if (userOpt.isEmpty()) {
            throw new ValidationException("INVALID_CREDENTIALS", "Email/tài khoản hoặc mật khẩu không chính xác.");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ValidationException("INVALID_CREDENTIALS", "Email/tài khoản hoặc mật khẩu không chính xác.");
        }

        if (!user.isActive()) {
            throw new ForbiddenException("USER_INACTIVE", "Tài khoản của bạn hiện đang bị tạm khóa hoặc chưa kích hoạt.");
        }

        String token = jwtTokenProvider.generateToken(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole()
        );

        return new AuthResponse(token, UserSummaryDto.fromEntity(user));
    }

    /**
     * Registers a new Student user in the system.
     *
     * Contract:
     * - args: request (RegisterRequest, required)
     * - input: displayName, email, password
     * - output: AuthResponse with JWT accessToken and UserSummaryDto
     * - errors:
     *     - ConflictException: EMAIL_ALREADY_EXISTS
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("EMAIL_ALREADY_EXISTS", "Địa chỉ email này đã được sử dụng trong hệ thống.");
        }

        String username = email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9_]", "");
        if (username.isBlank() || userRepository.existsByUsername(username)) {
            username = "student_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        }

        String userId = "usr_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        User newUser = new User(
                userId,
                email,
                username,
                encodedPassword,
                request.getDisplayName().trim(),
                "Asia/Ho_Chi_Minh",
                UserRole.STUDENT,
                "ACTIVE"
        );

        User saved = userRepository.save(newUser);
        String token = jwtTokenProvider.generateToken(
                saved.getId(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole()
        );

        return new AuthResponse(token, UserSummaryDto.fromEntity(saved));
    }
}
