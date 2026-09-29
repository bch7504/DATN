import React from "react";

export type BadgeStatus =
  | "READY"
  | "PROCESSING"
  | "UPLOADING"
  | "PENDING_PROCESSING"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REMOVED"
  | "ACTIVE"
  | "ARCHIVED"
  | "LOCKED"
  | "FAILED"
  | "GENERATING"
  | "REVIEW_REQUIRED";

interface StatusBadgeProps {
  status: BadgeStatus | string;
  label?: string;
  size?: "sm" | "md";
  showDot?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string; pulse?: boolean }
> = {
  READY: {
    label: "Sẵn sàng",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  APPROVED: {
    label: "Đã duyệt",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  ACTIVE: {
    label: "Đang mở",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  PROCESSING: {
    label: "Đang xử lý",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    pulse: true,
  },
  UPLOADING: {
    label: "Đang tải lên",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    pulse: true,
  },
  GENERATING: {
    label: "Đang sinh Quiz...",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    pulse: true,
  },
  PENDING_PROCESSING: {
    label: "Chờ xử lý",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  PENDING: {
    label: "Chờ duyệt",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  REVIEW_REQUIRED: {
    label: "Chờ kiểm tra",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  REJECTED: {
    label: "Từ chối",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  FAILED: {
    label: "Thất bại",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  LOCKED: {
    label: "Đã khóa",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  ARCHIVED: {
    label: "Lưu trữ",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  REMOVED: {
    label: "Đã rời lớp",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({
  status,
  label,
  size = "md",
  showDot = true,
}: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  const config = statusConfig[normalized] || {
    label: status,
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  };

  const displayText = label || config.label;
  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5"
      : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${
            config.pulse ? "animate-ping" : ""
          }`}
        />
      )}
      {displayText}
    </span>
  );
}
