"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  User,
  UserRole,
  LoginRequest,
  RegisterRequest,
  RegistrationStatusResponse,
  VerifyRegistrationRequest,
  ResendVerificationRequest,
} from "@/types/auth";
import { authApi } from "@/lib/api-client";

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<RegistrationStatusResponse>;
  verifyRegistration: (data: VerifyRegistrationRequest) => Promise<void>;
  resendVerification: (data: ResendVerificationRequest) => Promise<RegistrationStatusResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication and Session Provider component.
 * Manages user session state and provides auth methods.
 *
 * Contract:
 * - args: children: ReactNode
 * - input: React subtree
 * - output: JSX.Element providing AuthContext
 * - errors: handles login/session fetch errors safely
 *
 * @param {Object} props - Provider props
 * @param {ReactNode} props.children - Child elements
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    /** Args: none. Input: browser session cookie or a refreshable expired access token.
     * Output: void; restores the current user or clears an invalid session.
     * Errors: API failures are caught and leave the user unauthenticated.
     */
    async function initSession(): Promise<void> {
      try {
        const currentUser = await authApi.getMe();
        if (mounted) {
          setUser(currentUser);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void initSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    /** Args: none. Input: an API request whose refresh token was rejected by Java.
     * Output: void; clears the user so role guards return to login. Errors: none.
     */
    const onSessionExpired = (): void => { setUser(null); };
    window.addEventListener("studyflow:session-expired", onSessionExpired);
    return () => window.removeEventListener("studyflow:session-expired", onSessionExpired);
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest): Promise<User> => {
      setIsLoading(true);
      setError(null);
      try {
        const loggedInUser = await authApi.login(credentials);
        setUser(loggedInUser);
        return loggedInUser;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Đăng nhập không thành công. Vui lòng kiểm tra lại.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (data: RegisterRequest): Promise<RegistrationStatusResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        return await authApi.register(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Đăng ký không thành công. Vui lòng thử lại.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Args: pending email and six-digit OTP. Input: Student registration challenge.
   * Output: void after Java creates the account. Errors: API/validation errors propagate.
   */
  const verifyRegistration = useCallback(async (data: VerifyRegistrationRequest): Promise<void> => {
    setError(null);
    await authApi.verifyRegistration(data);
  }, []);

  /**
   * Args: pending registration email. Input: explicit resend after server cooldown.
   * Output: new OTP timing. Errors: API/validation errors propagate.
   */
  const resendVerification = useCallback(
    async (data: ResendVerificationRequest): Promise<RegistrationStatusResponse> => {
      setError(null);
      return await authApi.resendVerification(data);
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    role: user?.role ?? null,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    verifyRegistration,
    resendVerification,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to consume AuthContext.
 * Throws an informative error if used outside AuthProvider.
 *
 * @returns {AuthContextType}
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
