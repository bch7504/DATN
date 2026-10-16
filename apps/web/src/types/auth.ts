/**
 * Valid user roles in the StudyFlow platform.
 * As defined in docs/api-plan.md Section 1.
 */
export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

/**
 * Current authenticated user profile returned by GET /api/v1/me
 */
export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

/**
 * Request payload for POST /api/v1/auth/login
 */
export interface LoginRequest {
  identifier: string; // Email or username
  password: string;
}

/**
 * Request payload for POST /api/v1/auth/register
 * Only creates STUDENT account on backend.
 */
export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

/** POST /auth/register and /auth/resend-verification: pending OTP timing. */
export interface RegistrationStatusResponse {
  status: "VERIFICATION_REQUIRED";
  expiresAt: string;
  resendAvailableAt: string;
}

/** Alias for backward compatibility */
export type RegistrationStatus = RegistrationStatusResponse;

/** POST /auth/verify-registration: the six-digit code sent to this email. */
export interface VerifyRegistrationRequest {
  email: string;
  verificationCode: string;
}

/** POST /auth/resend-verification: pending registration email. */
export interface ResendVerificationRequest {
  email: string;
}

/**
 * Authentication context state
 */
export interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
  error: string | null;
}
