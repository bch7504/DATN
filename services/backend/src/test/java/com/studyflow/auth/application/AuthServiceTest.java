package com.studyflow.auth.application;

import com.studyflow.auth.dto.AuthResponse;
import com.studyflow.auth.dto.LoginRequest;
import com.studyflow.auth.dto.RegisterRequest;
import com.studyflow.common.exception.ConflictException;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.common.security.JwtTokenProvider;
import com.studyflow.common.security.UserRole;
import com.studyflow.user.domain.User;
import com.studyflow.user.domain.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    private AuthService authService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtTokenProvider);

        mockUser = new User(
                "usr_01", "student@ptit.edu.vn", "student_ptit",
                "encoded_pass", "Nguyễn Văn Sinh Viên", "Asia/Ho_Chi_Minh",
                UserRole.STUDENT, "ACTIVE"
        );
    }

    @Test
    @DisplayName("Should successfully login with valid email credentials")
    void shouldLoginSuccessfullyWithEmail() {
        LoginRequest req = new LoginRequest("student@ptit.edu.vn", "ptit@demo123");

        when(userRepository.findByEmail("student@ptit.edu.vn")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("ptit@demo123", "encoded_pass")).thenReturn(true);
        when(jwtTokenProvider.generateToken(any(), any(), any(), any())).thenReturn("mock_jwt_token");

        AuthResponse res = authService.login(req);

        assertNotNull(res);
        assertEquals("mock_jwt_token", res.getAccessToken());
        assertEquals("usr_01", res.getUser().getId());
        assertEquals("student@ptit.edu.vn", res.getUser().getEmail());
        assertEquals(UserRole.STUDENT, res.getUser().getRole());
    }

    @Test
    @DisplayName("Should reject login when password does not match")
    void shouldRejectWhenPasswordWrong() {
        LoginRequest req = new LoginRequest("student@ptit.edu.vn", "wrong_password");

        when(userRepository.findByEmail("student@ptit.edu.vn")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("wrong_password", "encoded_pass")).thenReturn(false);

        ValidationException ex = assertThrows(ValidationException.class, () -> authService.login(req));
        assertEquals("INVALID_CREDENTIALS", ex.getErrorCode());
    }

    @Test
    @DisplayName("Should successfully register a new student")
    void shouldRegisterStudentSuccessfully() {
        RegisterRequest req = new RegisterRequest("Trần Sinh Viên", "tran@ptit.edu.vn", "ptit@123456");

        when(userRepository.existsByEmail("tran@ptit.edu.vn")).thenReturn(false);
        when(passwordEncoder.encode("ptit@123456")).thenReturn("hashed_pass");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(any(), any(), any(), any())).thenReturn("mock_token");

        AuthResponse res = authService.register(req);

        assertNotNull(res);
        assertEquals("mock_token", res.getAccessToken());
        assertEquals("tran@ptit.edu.vn", res.getUser().getEmail());
        assertEquals(UserRole.STUDENT, res.getUser().getRole());

        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject registration when email already exists")
    void shouldRejectDuplicateEmailRegistration() {
        RegisterRequest req = new RegisterRequest("Trần Sinh Viên", "tran@ptit.edu.vn", "ptit@123456");
        when(userRepository.existsByEmail("tran@ptit.edu.vn")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(req));
        assertEquals("EMAIL_ALREADY_EXISTS", ex.getErrorCode());
        verify(userRepository, never()).save(any());
    }
}
