"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api-client";
import type { AdminPage, AdminUser, AdminUserRole, AdminUserStatus } from "@/types/admin";
import { AdminHeader, AdminPagination, AdminStatus, adminDate, adminErrorMessage, adminInput, adminSecondaryButton, adminTable, adminTd, adminTh } from "@/components/admin/admin-ui";
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

  return <div className="space-y-5">
    <AdminHeader title="Người dùng & Vai trò" description="Quản lý vai trò và trạng thái tài khoản. Quyền riêng tư của dữ liệu học tập được giữ theo API." />
    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label className="min-w-44 flex-1 text-xs font-semibold text-slate-600">Vai trò<select value={role} onChange={(event) => { setRole(event.target.value as AdminUserRole | "ALL"); setPage(0); setLoading(true); }} className={`mt-1 ${adminInput}`}><option value="ALL">Tất cả</option>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="min-w-44 flex-1 text-xs font-semibold text-slate-600">Trạng thái<select value={status} onChange={(event) => { setStatus(event.target.value as AdminUserStatus | "ALL"); setPage(0); setLoading(true); }} className={`mt-1 ${adminInput}`}><option value="ALL">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-12"><LoadingSpinner size="lg" text="Đang tải người dùng..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Chưa có tài khoản phù hợp" description="Thử đổi bộ lọc để xem tài khoản khác." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className={adminTable}><thead><tr>{["Họ tên", "Email / Tài khoản", "Vai trò", "Trạng thái", "Tạo lúc", ""].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((user) => <tr key={user.id}><td className={adminTd}>{user.fullName || "—"}</td><td className={adminTd}><div>{user.email}</div><div className="text-xs text-slate-400">{user.username}</div></td><td className={adminTd}>{user.role}</td><td className={adminTd}><AdminStatus status={user.status} /></td><td className={adminTd}>{adminDate(user.createdAt)}</td><td className={adminTd}><Link href={`/admin/users/${encodeURIComponent(user.id)}/edit?page=${page}`} className={adminSecondaryButton}>Chỉnh sửa</Link></td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}

  </div>;
}
