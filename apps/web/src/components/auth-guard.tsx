"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, LoaderCircle, ShieldX } from "lucide-react";
import { ApiClientError, getCurrentUser, isDemoMode } from "@/lib/api-client";
import type { AuthenticatedUser, UserRole } from "@/types/api";
import { SessionProvider } from "@/components/auth-context";

type RouteRole = "student" | "teacher" | "admin";

const routeRoleMap: Record<RouteRole, UserRole> = {
  student: "STUDENT",
  teacher: "TEACHER",
  admin: "ADMIN",
};

const demoUsers: Record<RouteRole, AuthenticatedUser> = {
  student: { id: "demo-student", displayName: "Nguyễn Minh Khang", email: "student@demo.invalid", role: "STUDENT" },
  teacher: { id: "demo-teacher", displayName: "TS. Nguyễn Minh Anh", email: "teacher@demo.invalid", role: "TEACHER" },
  admin: { id: "demo-admin", displayName: "Trần Hoài Nam", email: "admin@demo.invalid", role: "ADMIN" },
};

interface AuthGuardProps {
  routeRole: RouteRole;
  children: ReactNode;
}

/**
 * Protects one role workspace using the Java `/me` session contract.
 * @param routeRole Role encoded by the requested workspace URL.
 * @param children Workspace rendered only after authentication and role checks.
 * @returns Loading, forbidden, unavailable, or protected workspace state.
 */
export function AuthGuard({ routeRole, children }: AuthGuardProps) {
  const router = useRouter();
  const demo = isDemoMode();
  const [user, setUser] = useState<AuthenticatedUser | null>(demo ? demoUsers[routeRole] : null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!demo);

  useEffect(() => {
    if (demo) return;
    let active = true;
    getCurrentUser()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof ApiClientError && reason.status === 401) {
          router.replace("/login");
          return;
        }
        setError("Không thể xác minh phiên đăng nhập với Java Backend.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo, router, routeRole]);

  if (loading) {
    return <main className="auth-state-page"><LoaderCircle className="spin" /><h1>Đang xác minh phiên</h1><p>StudyFlow đang kiểm tra quyền truy cập của bạn.</p></main>;
  }
  if (error || !user) {
    return <main className="auth-state-page"><AlertTriangle /><h1>Không thể tải phiên</h1><p>{error ?? "Phiên đăng nhập không hợp lệ."}</p><button className="button primary" onClick={() => window.location.reload()}>Thử lại</button></main>;
  }
  if (user.role !== routeRoleMap[routeRole]) {
    const ownRoute = user.role.toLowerCase();
    return <main className="auth-state-page"><ShieldX /><h1>Không có quyền truy cập</h1><p>Tài khoản {user.role} không thể mở không gian {routeRoleMap[routeRole]}.</p><Link className="button primary" href={`/${ownRoute}/dashboard`}>Về không gian của tôi</Link></main>;
  }
  return <SessionProvider user={user} demo={demo}>{children}</SessionProvider>;
}
