"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api-client";
import type { AdminPage, AdminSemester } from "@/types/admin";
import { AdminConfirmDialog, AdminPagination, AdminStatus, adminErrorMessage, adminPrimaryButton, adminSecondaryButton, adminTable, adminTd, adminTh } from "./admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";


/** Args: none. Input: Admin Semester CRUD API. Output: paginated catalog and edit/delete dialogs. Errors: shown inline; Java enforces class references and dates. */
export function SemesterPanel(): React.JSX.Element {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminPage<AdminSemester> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState<AdminSemester | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let active = true;
    adminApi.getSemesters(page).then((result) => { if (active) { setData(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [page, reload]);

  /** Args: none. Input: selected Semester ID. Output: deleted entry and refreshed page. Errors: in-use/missing response shown inline. */
  async function remove(): Promise<void> {
    if (!deleting) return;
    setBusy(true); setActionError(null);
    try {
      await adminApi.deleteSemester(deleting.id);
      setDeleting(null); setSuccess("Đã xóa học kỳ."); setPage(0); setLoading(true); setReload((value) => value + 1);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Bật/tắt quyền mở lớp theo từng học kỳ.</p><Link href="/admin/catalog/semesters/new" className={adminPrimaryButton}>+ Thêm học kỳ</Link></div>
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-10"><LoadingSpinner text="Đang tải học kỳ..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Chưa có học kỳ" description="Thêm học kỳ để thiết lập thời gian mở lớp." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className={adminTable}><thead><tr>{["Mã", "Tên / Năm học", "Thời gian", "Trạng thái", "Mở lớp", ""].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((semester) => <tr key={semester.id}><td className={adminTd}>{semester.code}</td><td className={adminTd}>{semester.name}<div className="text-xs text-slate-400">{semester.academicYear}</div></td><td className={adminTd}>{semester.startDate} – {semester.endDate}</td><td className={adminTd}><AdminStatus status={semester.status} /></td><td className={adminTd}>{semester.offeringCreationEnabled ? "Cho phép" : "Tắt"}</td><td className={`${adminTd} whitespace-nowrap`}><Link href={`/admin/catalog/semesters/${encodeURIComponent(semester.id)}/edit`} className={adminSecondaryButton}>Sửa</Link><button type="button" onClick={() => { setDeleting(semester); setActionError(null); }} className="ml-2 text-sm font-semibold text-red-600">Xóa</button></td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}

    {deleting && <AdminConfirmDialog title="Xóa học kỳ?" message={`Học kỳ ${deleting.code} chỉ có thể xóa nếu chưa có lớp học phần.`} confirmLabel="Xóa học kỳ" onCancel={() => setDeleting(null)} onConfirm={() => void remove()} busy={busy} error={actionError} />}
  </div>;
}
