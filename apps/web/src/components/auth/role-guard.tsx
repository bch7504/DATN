"use client";

import React, { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { UserRole } from "@/types/auth";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { ForbiddenState } from "@/components/ui/error-states";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Route protection component restricting access by user role.
 *
 * Contract:
 * - args:
 *   - allowedRoles: UserRole[] (roles with permission)
 *   - children: ReactNode (content to render when authorized)
 *   - fallback?: ReactNode (optional fallback component)
 * - input: current session from useAuth()
 * - output: JSX.Element (children, LoadingSpinner, or ForbiddenState)
 * - errors: redirects to /login if unauthenticated
 *
 * @param {RoleGuardProps} props
 * @returns {JSX.Element}
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallback,
}: RoleGuardProps) {
  const { user, role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Đang xác thực quyền truy cập..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="md" text="Đang chuyển hướng đến trang đăng nhập..." />
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      fallback || (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <ForbiddenState requiredRole={allowedRoles.join(" hoặc ")} />
        </div>
      )
    );
  }

  return <>{children}</>;
}
