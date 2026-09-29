"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { PtitLogo } from "@/components/ui/ptit-logo";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { UserRole } from "@/types/auth";
import { DEMO_USERS } from "@/lib/demo-data";
import { GraduationCap, BookOpen, ShieldCheck, ArrowRight, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated, role, isDemo } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === "TEACHER") router.replace("/teacher/dashboard");
      else if (role === "ADMIN") router.replace("/admin/dashboard");
      else router.replace("/dashboard");
    }
  }, [isAuthenticated, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setLoginError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setSubmitting(true);
    setLoginError(null);

    try {
      const loggedUser = await login({ identifier, password });
      if (loggedUser.role === "TEACHER") {
        router.push("/teacher/dashboard");
      } else if (loggedUser.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Đăng nhập không thành công. Vui lòng kiểm tra lại.";
      setLoginError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (targetRole: UserRole) => {
    const demo = DEMO_USERS[targetRole];
    setIdentifier(demo.email);
    setPassword("ptit@demo123");
    setSubmitting(true);
    setLoginError(null);

    try {
      const loggedUser = await login({
        identifier: demo.email,
        password: "ptit@demo123",
      });
      if (loggedUser.role === "TEACHER") {
        router.push("/teacher/dashboard");
      } else if (loggedUser.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập demo thất bại";
      setLoginError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#fff1f2]/30 to-amber-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full border-2 border-[#d71920] bg-white flex items-center justify-center shadow-lg mb-4 hover:scale-105 transition-transform">
            <PtitLogo size={36} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
            StudyFlow <span className="text-[#d71920]">· PTIT</span>
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#64748b]">
            Học viện Công nghệ Bưu chính Viễn thông
          </p>
          <p className="mt-2 text-sm text-[#475569]">
            Cổng thông tin học tập, học liệu bài giảng và trợ lý ôn thi
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200/80">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {loginError && (
              <ErrorAlert
                message={loginError}
                onRetry={() => setLoginError(null)}
              />
            )}

            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Email hoặc Tên đăng nhập
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="student@ptit.edu.vn"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Mật khẩu
                </label>
                <span className="text-xs text-slate-400">Tối thiểu 6 ký tự</span>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#d71920] hover:bg-[#b9151b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-60 transition"
            >
              {submitting ? (
                <LoadingSpinner size="sm" text="Đang xác thực..." />
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          {isDemo && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="text-center mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  ⚡ Đăng nhập nhanh (Chế độ Demo)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo("STUDENT")}
                  disabled={submitting}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100/70 text-red-900 transition text-center group"
                >
                  <GraduationCap className="w-4 h-4 text-red-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Sinh viên</span>
                  <span className="text-[10px] text-slate-500 truncate w-full">student@ptit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo("TEACHER")}
                  disabled={submitting}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-amber-900 transition text-center group"
                >
                  <BookOpen className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Giảng viên</span>
                  <span className="text-[10px] text-slate-500 truncate w-full">teacher@ptit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo("ADMIN")}
                  disabled={submitting}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-purple-900 transition text-center group"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Quản trị</span>
                  <span className="text-[10px] text-slate-500 truncate w-full">admin@ptit</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Sinh viên mới chưa có tài khoản?{" "}
              <Link
                href="/register"
                className="font-semibold text-red-600 hover:text-red-700 underline"
              >
                Đăng ký tài khoản
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Hệ thống Quản lý Học tập StudyFlow © 2026 PTIT · All rights reserved
        </p>
      </div>
    </div>
  );
}
