"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api-client";
import type { AdminPage, AdminUser, AdminUserRole, AdminUserStatus } from "@/types/admin";
import { AdminHeader, AdminModal, AdminPagination, AdminStatus, adminDate, adminErrorMessage, adminInput, adminPrimaryButton, adminSecondaryButton, adminTable, adminTd, adminTh } from "@/components/admin/admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";

const roles: AdminUserRole[] = ["STUDENT", "TEACHER", "ADMIN"];
const statuses: AdminUserStatus[] = ["ACTIVE", "LOCKED"];

/** Args: none. Input: paginated Admin User API; filters from URL or controls. Output: User list and role/status editor. Errors: shown inline, server permissions enforced by Java. */
export default function AdminUsersPage(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<AdminUserRole | "ALL">("ALL");
  const [status, setStatus] = useState<AdminUserStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminPage<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [draftRole, setDraftRole] = useState<AdminUserRole>("STUDENT");
  const [draftStatus, setDraftStatus] = useState<AdminUserStatus>("ACTIVE");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const queryRole = new URLSearchParams(window.location.search).get("role");
    if (roles.includes(queryRole as AdminUserRole)) setRole(queryRole as AdminUserRole);
    setReady(true);
  }, []);

  useEffect((): (() => void) => {
    if (!ready) return (): void => {};
    let active = true;
    adminApi.getUsers(page, 20, role === "ALL" ? undefined : role, status === "ALL" ? undefined : status)
      .then((result) => { if (active) { setData(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [ready, role, status, page, reload]);

  /** Args: selected User. Input: row action. Output: opens edit modal with current values. Errors: none. */
  function openEdit(user: AdminUser): void {
    setEditing(user); setDraftRole(user.role); setDraftStatus(user.status); setActionError(null);
  }

  /** Args: form submit event. Input: changed role/status; Admin session. Output: updated User and refreshed page. Errors: shown in modal. */
  async function saveUser(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editing) return;
    if (draftRole === editing.role && draftStatus === editing.status) { setEditing(null); return; }
    setBusy(true); setActionError(null);
    try {
      await adminApi.updateUser(editing.id, { role: draftRole, status: draftStatus });
      setEditing(null); setSuccess("Đã cập nhật tài khoản."); setLoading(true); setReload((value) => value + 1);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <AdminHeader title="Người dùng & Vai trò" description="Quản lý vai trò và trạng thái tài khoản. Quyền riêng tư của dữ liệu học tập được giữ theo API." />
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label className="min-w-44 flex-1 text-xs font-semibold text-slate-600">Vai trò<select value={role} onChange={(event) => { setRole(event.target.value as AdminUserRole | "ALL"); setPage(0); setLoading(true); }} className={`mt-1 ${adminInput}`}><option value="ALL">Tất cả</option>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="min-w-44 flex-1 text-xs font-semibold text-slate-600">Trạng thái<select value={status} onChange={(event) => { setStatus(event.target.value as AdminUserStatus | "ALL"); setPage(0); setLoading(true); }} className={`mt-1 ${adminInput}`}><option value="ALL">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-12"><LoadingSpinner size="lg" text="Đang tải người dùng..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Chưa có tài khoản phù hợp" description="Thử đổi bộ lọc để xem tài khoản khác." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className={adminTable}><thead><tr>{["Họ tên", "Email / Tài khoản", "Vai trò", "Trạng thái", "Tạo lúc", ""].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((user) => <tr key={user.id}><td className={adminTd}>{user.fullName || "—"}</td><td className={adminTd}><div>{user.email}</div><div className="text-xs text-slate-400">{user.username}</div></td><td className={adminTd}>{user.role}</td><td className={adminTd}><AdminStatus status={user.status} /></td><td className={adminTd}>{adminDate(user.createdAt)}</td><td className={adminTd}><button type="button" onClick={() => openEdit(user)} className={adminSecondaryButton}>Chỉnh sửa</button></td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}
    {editing && <AdminModal title={`Cập nhật tài khoản ${editing.email}`} onClose={() => setEditing(null)} busy={busy}><form onSubmit={saveUser} className="space-y-4">
      <label className="block text-sm font-semibold text-slate-700">Vai trò<select value={draftRole} onChange={(event) => setDraftRole(event.target.value as AdminUserRole)} className={`mt-1 ${adminInput}`}>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="block text-sm font-semibold text-slate-700">Trạng thái<select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as AdminUserStatus)} className={`mt-1 ${adminInput}`}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <p className="text-xs text-slate-500">Đổi vai trò hoặc trạng thái sẽ thu hồi phiên đăng nhập hiện tại của tài khoản này.</p>
      {actionError && <ErrorAlert message={actionError} />}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} disabled={busy} className={adminSecondaryButton}>Hủy</button><button type="submit" disabled={busy} className={adminPrimaryButton}>{busy ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
    </form></AdminModal>}
  </div>;
}
