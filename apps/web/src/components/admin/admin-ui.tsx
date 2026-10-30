"use client";

import React, { useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Args: unknown caught value. Input: Java client error or transport failure. Output: safe message. Errors: none. */
export function adminErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Không thể hoàn tất yêu cầu. Vui lòng thử lại.";
}

/** Args: ISO date/time or null. Input: Java response timestamp. Output: local date/time label. Errors: malformed values return a dash. */
export function adminDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

/** Args: heading, description, optional action. Input: Admin page metadata. Output: heading UI; no side effects. Errors: none. */
export function AdminHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }): React.JSX.Element {
  return <div className="flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-extrabold text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>
    {action}
  </div>;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang hoạt động", INACTIVE: "Ngừng dùng", LOCKED: "Đã khóa", ARCHIVED: "Lưu trữ",
  UPCOMING: "Sắp diễn ra", CLOSED: "Đã đóng", OPEN: "Chưa xử lý", RESOLVED: "Đã xử lý",
};

/** Args: status code. Input: Java enum. Output: color-coded status label. Errors: unknown status shown verbatim. */
export function AdminStatus({ status }: { status: string }): React.JSX.Element {
  const color = status === "ACTIVE" || status === "RESOLVED"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "OPEN" || status === "UPCOMING"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>{STATUS_LABELS[status] ?? status}</span>;
}

/** Args: Java pagination metadata and page setter. Input: a 0-based page. Output: navigation controls; invokes onChange. Errors: none. */
export function AdminPagination({ page, totalPages, totalItems, onChange }: { page: number; totalPages: number; totalItems: number; onChange: (nextPage: number) => void }): React.JSX.Element {
  return <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
    <span>{totalItems} mục · Trang {totalPages === 0 ? 0 : page + 1}/{totalPages}</span>
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 0} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 disabled:opacity-40"><ChevronLeft className="inline h-4 w-4" /> Trước</button>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page + 1 >= totalPages} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 disabled:opacity-40">Sau <ChevronRight className="inline h-4 w-4" /></button>
    </div>
  </div>;
}

/** Args: title, children, close callback and busy state. Input: Admin action content. Output: accessible in-app dialog. Errors: none. */
export function AdminModal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }): React.JSX.Element {
  useEffect((): (() => void) => {
    function handleKey(event: KeyboardEvent): void { if (event.key === "Escape" && !busy) onClose(); }
    window.addEventListener("keydown", handleKey);
    return (): void => window.removeEventListener("keydown", handleKey);
  }, [busy, onClose]);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-3"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button type="button" onClick={onClose} disabled={busy} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X className="h-5 w-5" /></button></div>
      {children}
    </div>
  </div>;
}

/** Args: title, message, confirmation label, callbacks and busy state. Input: pending destructive Admin action. Output: in-app confirmation; no mutation until onConfirm. Errors: caller displays API failures. */
export function AdminConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm, busy = false, error }: { title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void; busy?: boolean; error?: string | null }): React.JSX.Element {
  return <AdminModal title={title} onClose={onCancel} busy={busy}>
    <p className="text-sm leading-relaxed text-slate-600">{message}</p>
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40">Hủy</button><button type="button" onClick={onConfirm} disabled={busy} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Đang xử lý..." : confirmLabel}</button></div>
  </AdminModal>;
}

export const adminPrimaryButton = "rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50";
export const adminSecondaryButton = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
export const adminInput = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100";
export const adminTable = "min-w-full text-left text-sm";
export const adminTh = "border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500";
export const adminTd = "border-b border-slate-100 px-4 py-3 text-slate-700";
