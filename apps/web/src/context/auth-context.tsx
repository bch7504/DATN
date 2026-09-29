"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User, UserRole, LoginRequest, RegisterRequest } from "@/types/auth";
import { authApi } from "@/lib/api-client";
import { isDemoMode } from "@/lib/env";
import { DEMO_USERS } from "@/lib/demo-data";

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (targetRole: UserRole) => void;
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
  const [isDemo] = useState<boolean>(() => isDemoMode());

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
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

    initSession();

    return () => {
      mounted = false;
    };
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
    async (data: RegisterRequest): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await authApi.register(data);
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

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const switchDemoRole = useCallback((targetRole: UserRole): void => {
    const targetUser = DEMO_USERS[targetRole];
    if (targetUser) {
      authApi.setDemoUser(targetUser);
      setUser(targetUser);
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
    isDemo,
    error,
    login,
    register,
    logout,
    switchDemoRole,
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
