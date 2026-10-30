"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api-client";
import type { AdminPage, AdminSubject } from "@/types/admin";
import { AdminConfirmDialog, AdminPagination, AdminStatus, adminErrorMessage, adminPrimaryButton, adminSecondaryButton, adminTable, adminTd, adminTh } from "./admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";


/** Args: none. Input: Admin Subject CRUD API. Output: paginated catalog and edit/delete dialogs. Errors: shown inline; Java enforces references and uniqueness. */
export function SubjectPanel(): React.JSX.Element {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminPage<AdminSubject> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState<AdminSubject | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let active = true;
    adminApi.getSubjects(page).then((result) => { if (active) { setData(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [page, reload]);

  /** Args: none. Input: selected Subject ID. Output: deleted catalog entry and refreshed list. Errors: in-use/missing response shown inline. */
  async function remove(): Promise<void> {
    if (!deleting) return;
    setBusy(true); setActionError(null);
    try {
      await adminApi.deleteSubject(deleting.id);
      setDeleting(null); setSuccess("Đã xóa môn học."); setPage(0); setLoading(true); setReload((value) => value + 1);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Môn học được giảng viên chọn khi mở lớp.</p><Link href="/admin/catalog/subjects/new" className={adminPrimaryButton}>+ Thêm môn học</Link></div>
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-10"><LoadingSpinner text="Đang tải môn học..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Chưa có môn học" description="Thêm môn học để giảng viên có thể mở lớp học phần." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className={adminTable}><thead><tr>{["Mã", "Tên môn học", "Tín chỉ", "Mô tả", "Trạng thái", ""].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((subject) => <tr key={subject.id}><td className={adminTd}>{subject.code}</td><td className={adminTd}>{subject.name}</td><td className={adminTd}>{subject.credits}</td><td className={`${adminTd} max-w-xs truncate`} title={subject.description ?? ""}>{subject.description || "—"}</td><td className={adminTd}><AdminStatus status={subject.status} /></td><td className={`${adminTd} whitespace-nowrap`}><Link href={`/admin/catalog/subjects/${encodeURIComponent(subject.id)}/edit`} className={adminSecondaryButton}>Sửa</Link><button type="button" onClick={() => { setDeleting(subject); setActionError(null); }} className="ml-2 text-sm font-semibold text-red-600">Xóa</button></td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}

    {deleting && <AdminConfirmDialog title="Xóa môn học?" message={`Môn ${deleting.code} sẽ bị xóa khỏi danh mục nếu chưa có lớp học phần tham chiếu.`} confirmLabel="Xóa môn học" onCancel={() => setDeleting(null)} onConfirm={() => void remove()} busy={busy} error={actionError} />}
  </div>;
}
