"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminApi } from "@/lib/api-client";
import { findAdminRecord } from "@/lib/admin-detail";
import type { AdminUser, AdminUserRole, AdminUserStatus } from "@/types/admin";
import { AdminHeader, adminErrorMessage, adminInput, adminPrimaryButton, adminSecondaryButton } from "@/components/admin/admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: none. Input: userId route segment and authorized Admin API. Output: dedicated account editor. Errors: API and missing-record errors appear in-page. */
export default function AdminUserEditPage(): ReactElement {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<AdminUserRole>("STUDENT");
  const [status, setStatus] = useState<AdminUserStatus>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const preferredPage = Math.max(0, Number.parseInt(new URLSearchParams(window.location.search).get("page") ?? "0", 10) || 0);
    findAdminRecord(userId, (page) => adminApi.getUsers(page, 20), preferredPage)
      .then((record) => {
        if (!active) return;
        setUser(record);
        if (record) { setRole(record.role); setStatus(record.status); }
        else setError("Không tìm thấy tài khoản.");
      })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  /** Args: form event. Input: changed role/status and authorized Admin. Output: Promise<void>; saves account settings through Java. Errors: shows API validation/RBAC error. */
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user) return;
    setBusy(true); setError(null); setSuccess(false);
    try { setUser(await adminApi.updateUser(user.id, { role, status })); setSuccess(true); }
    catch (cause: unknown) { setError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-2xl space-y-5">
    <Link href="/admin/users" className={adminSecondaryButton}>← Danh sách tài khoản</Link>
    <AdminHeader title="Chỉnh sửa tài khoản" description="Cập nhật vai trò và trạng thái tài khoản." />
    {loading && <LoadingSpinner size="lg" text="Đang tải tài khoản..." />}
    {error && <ErrorAlert message={error} />}
    {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Đã cập nhật tài khoản.</p>}
    {!loading && user && <form onSubmit={(event) => void save(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="border-b border-slate-100 pb-4"><h2 className="font-bold text-slate-900">{user.fullName || user.username}</h2><p className="mt-1 text-sm text-slate-500">{user.email}</p></div>
      <label className="block text-sm font-semibold text-slate-700">Vai trò<select value={role} onChange={(event) => setRole(event.target.value as AdminUserRole)} className={`mt-1 ${adminInput}`}>{["STUDENT", "TEACHER", "ADMIN"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="block text-sm font-semibold text-slate-700">Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as AdminUserStatus)} className={`mt-1 ${adminInput}`}><option value="ACTIVE">ACTIVE</option><option value="LOCKED">LOCKED</option></select></label>
      <p className="text-xs text-slate-500">Đổi vai trò hoặc trạng thái sẽ thu hồi phiên đăng nhập hiện tại của tài khoản này.</p>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Link href="/admin/users" className={adminSecondaryButton}>Về danh sách</Link><button disabled={busy} className={adminPrimaryButton}>{busy ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
    </form>}
  </main>;
}
