"use client";

import React from "react";
import { AlertCircle, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

interface ErrorAlertProps {
  code?: string;
  message: string;
  traceId?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({
  code,
  message,
  traceId,
  onRetry,
  className = "",
}: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          {code && (
            <span className="inline-block text-[11px] font-mono font-bold tracking-wide uppercase px-2 py-0.5 bg-rose-200/60 rounded text-rose-800">
              {code}
            </span>
          )}
          <p className="text-sm font-medium">{message}</p>
          {traceId && (
            <p className="text-xs text-rose-700/80 font-mono">
              Trace ID: <span className="underline select-all">{traceId}</span>
            </p>
          )}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-100  text-rose-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Thử lại
          </button>
        )}
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Đã xảy ra lỗi",
  description = "Không thể tải dữ liệu yêu cầu. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.",
  code,
  traceId,
  onRetry,
}: {
  title?: string;
  description?: string;
  code?: string;
  traceId?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600 mt-1 mb-4">{description}</p>
      {code && (
        <p className="text-xs font-mono text-slate-500 mb-4 bg-slate-100 px-3 py-1 rounded">
          Mã lỗi: {code} {traceId && `· ${traceId}`}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600  text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <RefreshCw className="w-4 h-4" /> Thử lại
        </button>
      )}
    </div>
  );
}

export function ForbiddenState({
  requiredRole,
}: {
  requiredRole?: string;
}) {
  const { role } = useAuth();

  const getDashboardHref = () => {
    if (role === "TEACHER") return "/teacher/dashboard";
    if (role === "ADMIN") return "/admin/dashboard";
    return "/dashboard";
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">403 · Không có quyền truy cập</h2>
      <p className="text-sm text-slate-600 mt-2 mb-6">
        Tài khoản hiện tại ({role || "Khách"}) không có quyền truy cập khu vực này.
        {requiredRole && ` Trang này dành riêng cho vai trò ${requiredRole}.`}
      </p>
      <Link
        href={getDashboardHref()}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600  text-white text-sm font-semibold rounded-xl shadow-md transition"
      >
        <ArrowLeft className="w-4 h-4" /> Về Bảng điều khiển của bạn
      </Link>
    </div>
  );
}
