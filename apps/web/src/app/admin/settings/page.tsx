"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api-client";
import type { AdminSettings } from "@/types/admin";
import { AdminConfirmDialog, AdminHeader, adminErrorMessage, adminPrimaryButton } from "@/components/admin/admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: none. Input: GET/PATCH /admin/system-settings. Output: registration control with confirmation. Errors: shown inline. */
export default function AdminSettingsPage(): React.JSX.Element {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let active = true;
    adminApi.getSettings().then((result) => { if (active) { setSettings(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); });
    return (): void => { active = false; };
  }, [reload]);

  /** Args: none. Input: confirmed registrationEnabled value. Output: saved Java settings and updated view. Errors: shown in dialog. */
  async function save(): Promise<void> {
    if (pending === null) return;
    setBusy(true); setActionError(null);
    try {
      setSettings(await adminApi.updateSettings(pending));
      setSuccess(pending ? "Đã bật đăng ký tài khoản." : "Đã tắt đăng ký tài khoản.");
      setPending(null);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <AdminHeader title="Cấu hình hệ thống" description="Chỉ hiển thị cấu hình vận hành được phép thay đổi qua Java Backend." />
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setSettings(null); setReload((value) => value + 1); }} />}
    {!error && !settings && <div className="py-12"><LoadingSpinner size="lg" text="Đang tải cấu hình..." /></div>}
    {settings && <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold text-slate-900">Đăng ký tài khoản mới</h2><p className="mt-1 text-sm text-slate-500">Có hiệu lực với yêu cầu đăng ký tiếp theo.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${settings.registrationEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{settings.registrationEnabled ? "Đang bật" : "Đang tắt"}</span></div><button type="button" onClick={() => { setPending(!settings.registrationEnabled); setActionError(null); }} className={`mt-5 ${adminPrimaryButton}`}>{settings.registrationEnabled ? "Tắt đăng ký" : "Bật đăng ký"}</button></div>}
    {pending !== null && <AdminConfirmDialog title={pending ? "Bật đăng ký tài khoản?" : "Tắt đăng ký tài khoản?"} message={pending ? "Người dùng mới sẽ có thể đăng ký tài khoản." : "Người dùng mới sẽ không thể đăng ký tài khoản cho đến khi bật lại."} confirmLabel="Lưu cấu hình" onCancel={() => setPending(null)} onConfirm={() => void save()} busy={busy} error={actionError} />}
  </div>;
}
