import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  text,
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-slate-500 ${className}`}
      role="status"
      aria-label="Đang tải dữ liệu"
    >
      <Loader2 className={`animate-spin text-red-600 ${sizeClasses}`} />
      {text && <span className="text-sm font-medium">{text}</span>}
    </div>
  );
}

export function LoadingSkeleton({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`} role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200 rounded"
          style={{ width: `${Math.max(40, 100 - i * 18)}%` }}
        />
      ))}
    </div>
  );
}

export function LoadingOverlay({ text = "Đang xử lý..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-sm w-full text-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <h3 className="font-semibold text-slate-800 text-base">{text}</h3>
        <p className="text-xs text-slate-500">
          Vui lòng đợi hệ thống kiểm tra và xác thực dữ liệu...
        </p>
      </div>
    </div>
  );
}
